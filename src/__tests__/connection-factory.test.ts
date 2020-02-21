/**
 * connection-factory.test.ts
 *
 * Distributed under terms of the MIT license.
 * @module connection-factory.test.ts
 */
import * as amqp from 'amqplib';
import * as Logger from 'bunyan';

import { RabbitMqSingletonConnectionFactory } from '../main';

const logger = Logger.createLogger({ name: 'connection-factory.test' });
describe('connection-factory', () => {
  it('amqplib should be mocked', async () => {
    expect(amqp).toBeTruthy();
    expect((amqp.connect as any).mock).toBeTruthy();
  });
  describe('create', () => {
    it('should call amqp.connect', async () => {
      const factory = new RabbitMqSingletonConnectionFactory(logger, '');
      await factory.create();
      expect(amqp.connect).toBeCalled();
    });
  });
  describe('getChannel', () => {
    let channel: amqp.Channel;
    let factory: RabbitMqSingletonConnectionFactory;
    beforeEach(async () => {
      factory = new RabbitMqSingletonConnectionFactory(logger, '');
      channel = await factory.getChannel();
    });
    it('channel instance should be created', async () => {
      const conn = await factory.create();
      expect(conn.createChannel).toBeTruthy();
      expect(conn.createChannel).toBeCalled();
      expect(channel).toBeTruthy();
    });
  });
});
