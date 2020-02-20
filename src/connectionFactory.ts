import * as amqp from 'amqplib';
import * as Logger from 'bunyan';
import { createChildLogger } from './childLogger';

export interface IRabbitMqConnectionFactory {
  create(): Promise<amqp.Connection>;
  getChannel(): Promise<amqp.Channel>;
}

export interface IRabbitMqConnectionConfig {
  host: string;
  port: number;
}

function isConnectionConfig(
  config: IRabbitMqConnectionConfig | string,
): config is IRabbitMqConnectionConfig {
  if ((config as IRabbitMqConnectionConfig).host && (config as IRabbitMqConnectionConfig).port) {
    return true;
  }
  return false;
}

export class RabbitMqSingletonConnectionFactory implements IRabbitMqConnectionFactory {
  private connection: string;

  private promise: Promise<amqp.Connection>;

  private channel: amqp.Channel;

  constructor(private logger: Logger, config: IRabbitMqConnectionConfig | string) {
    this.connection = isConnectionConfig(config) ? `amqp://${config.host}:${config.port}` : config;
    this.logger = createChildLogger(logger, 'RabbitMqConnectionFactory');
  }

  create(): Promise<amqp.Connection> {
    if (this.promise) {
      this.logger.trace('reusing connection to %s', this.connection);
      return this.promise;
    }
    this.logger.debug('creating connection to %s', this.connection);
    this.promise = Promise.resolve(amqp.connect(this.connection));
    return this.promise;
  }

  async getChannel(): Promise<amqp.Channel> {
    if (this.channel) {
      this.channel = await (await this.create()).createChannel();
    }
    return this.channel;
  }
}
