import * as amqp from 'amqplib';
import * as Logger from 'bunyan';
import * as BPromise from 'bluebird';
import { IRabbitMqConnectionFactory } from './connectionFactory';
import { IQueueNameConfig } from './queue-name-config';
import { asQueueNameConfig } from './common';
import { createChildLogger } from './childLogger';

export interface IRabbitMqConsumerDisposer {
  (): Promise<void>;
}

export class RabbitMqConsumer {
  constructor(private logger: Logger, private connectionFactory: IRabbitMqConnectionFactory) {
    this.logger = createChildLogger(logger, 'RabbitMqConsumer');
  }

  subscribe<T>(
    queue: string | IQueueNameConfig,
    action: (message: T) => Promise<any> | void,
  ): Promise<IRabbitMqConsumerDisposer> {
    const queueConfig = asQueueNameConfig(queue);
    return this.connectionFactory.getChannel()
      .then((channel) => {
        this.logger.trace("got channel for queue '%s'", queueConfig.name);
        return this.setupChannel<T>(channel, queueConfig)
          .then(() => this.subscribeToChannel<T>(channel, queueConfig, action))
      });
  }

  private setupChannel<T>(channel: amqp.Channel, queueConfig: IQueueNameConfig) {
    this.logger.trace("setup '%j'", queueConfig);
    return Promise.all(this.getChannelSetup(channel, queueConfig));
  }

  private subscribeToChannel<T>(
    channel: amqp.Channel,
    queueConfig: IQueueNameConfig,
    action: (message: T) => Promise<any> | void,
  ) {
    this.logger.trace("subscribing to queue '%s'", queueConfig.name);
    return channel.consume(queueConfig.name, (message) => {
      let msg: T;
      BPromise.try(() => {
        msg = this.getMessageObject<T>(message);
        this.logger.trace("message arrived from queue '%s' (%j)", queueConfig.name, msg)
        return action(msg);
      }).then(() => {
        this.logger.trace("message processed from queue '%s' (%j)", queueConfig.name, msg)
        channel.ack(message)
      }).catch((err) => {
        this.logger.error(err, "message processing failed from queue '%j' (%j)", queueConfig, msg);
        channel.nack(message, false, false);
      });
    }).then((opts) => {
      this.logger.trace("subscribed to queue '%s' (%s)", queueConfig.name, opts.consumerTag)
      return (() => {
        this.logger.trace("disposing subscriber to queue '%s' (%s)", queueConfig.name, opts.consumerTag)
        return BPromise.resolve(channel.cancel(opts.consumerTag)).return();
      }) as IRabbitMqConsumerDisposer
    });
  }

  protected getMessageObject<T>(message: amqp.Message) {
    return JSON.parse(message.content.toString('utf8')) as T;
  }

  protected getChannelSetup(channel: amqp.Channel, queueConfig: IQueueNameConfig) {
    return [
      channel.assertQueue(queueConfig.name, this.getQueueSettings(queueConfig.dlx)),
      channel.assertQueue(queueConfig.dlq, this.getDLSettings()),
      channel.assertExchange(queueConfig.dlx, 'fanout', this.getDLSettings()),
      channel.bindQueue(queueConfig.dlq, queueConfig.dlx, '*'),
    ]
  }

  protected getQueueSettings(deadletterExchangeName: string): amqp.Options.AssertQueue {
    const settings = this.getDLSettings();
    settings.arguments = {
      'x-dead-letter-exchange': deadletterExchangeName,
    }
    return settings;
  }

  protected getDLSettings(): amqp.Options.AssertQueue {
    return {
      durable: true,
      autoDelete: false,
    }
  }
}
