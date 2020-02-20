import * as amqp from 'amqplib';
import * as Logger from 'bunyan';
import { IRabbitMqConnectionFactory } from './connectionFactory';
import { IQueueNameConfig } from './queue-name-config';
import { asQueueNameConfig } from './common';
import { createChildLogger } from './childLogger';

export class RabbitMqProducer {
  constructor(private logger: Logger, private connectionFactory: IRabbitMqConnectionFactory) {
    this.logger = createChildLogger(logger, 'RabbitMqProducer');
  }

  async publish<T>(queue: string | IQueueNameConfig, message: T): Promise<amqp.Channel | Error> {
    const queueConfig = asQueueNameConfig(queue);
    const settings = this.getQueueSettings(queueConfig.dlx);
    const channel: amqp.Channel = await this.connectionFactory.getChannel();
    channel.assertQueue(queueConfig.name, settings);
    if (!channel.sendToQueue(queueConfig.name, this.getMessageBuffer(message))) {
      this.logger.error("unable to send message to queue '%j' {%j}", queueConfig, message)
      throw new Error('Unable to send message');
    }

    this.logger.trace("message sent to queue '%s' (%j)", queueConfig.name, message)
    return channel;
  }

  protected getMessageBuffer<T>(message: T) {
    return Buffer.from(JSON.stringify(message), 'utf8');
  }

  protected getQueueSettings(deadletterExchangeName: string): amqp.Options.AssertQueue {
    return {
      durable: true,
      autoDelete: false,
      arguments: {
        'x-dead-letter-exchange': deadletterExchangeName,
      },
    }
  }
}

export default RabbitMqProducer;
