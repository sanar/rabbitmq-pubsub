
import * as amqp from 'amqplib';
import { ConsoleLogger } from 'cdm-logger';
import * as BPromise from 'bluebird';
import {
  RabbitMqConsumer, RabbitMqProducer,
  IRabbitMqConnectionConfig, RabbitMqSingletonConnectionFactory,
} from '../main';
import 'jest';

import { DefaultQueueNameConfig } from '../queue-name-config';

const logger = ConsoleLogger.create('test', { level: 'trace' });
const config: IRabbitMqConnectionConfig = { host: '127.0.0.1', port: 5672 };
const invalidConfig: IRabbitMqConnectionConfig = { host: '127.0.0.1', port: 5670 };
const queueName = 'TestPCDurable';

interface IMessage {
  data: string;
  value: number;
}

describe('RabbitMqSingletonConnectionFactory Test', () => {
  it('amqplib should be mocked', async () => {
    expect(amqp).toBeTruthy();
    expect((amqp as any).mock).toBeTruthy();
  });
  it('Singleton Connection Factory should return singleton connection', () => {
    const f = new RabbitMqSingletonConnectionFactory(logger, config);
    return Promise.all([f.create(), f.create(), f.create()]).then((cons) => {
      expect(cons).toBeTruthy;
      expect(cons.length).toEqual(3);

      cons.forEach((con, i) => {
        expect(con).toBeTruthy;
        if (i > 0) {
          expect(cons[0]).toEqual(con);
        }
      })
    })
  })
})

describe('RabbitMq Test', () => {
  it('ConnectionFactory: Invalid Connection config should fail create', () => {
    const factory = new RabbitMqSingletonConnectionFactory(logger, invalidConfig);
    return factory.create().catch((v) => {
      expect(v).toBeTruthy;
      expect(v.code).toBe('ECONNREFUSED');
    });
  })

  it('RabbitMqConsumer: Invalid Connection config should fail subscribe', () => {
    const factory = new RabbitMqSingletonConnectionFactory(logger, invalidConfig);
    const consumer = new RabbitMqConsumer(logger, factory)
    return consumer.subscribe(queueName, (m) => { })
      .catch((v) => {
        expect(v).toBeTruthy;
        expect(v.code).toBe('ECONNREFUSED');
      })
  })

  it('RabbitMqProducer: Invalid Connection config should fail publish', () => {
    const factory = new RabbitMqSingletonConnectionFactory(logger, invalidConfig);
    const producer = new RabbitMqProducer(logger, factory)
    return producer.publish(queueName, {}).catch((v) => {
      expect(v).toBeTruthy;
      expect(v.code).toBe('ECONNREFUSED');
    });
  })

  it('Consumer should subscribe and dispose ok with simple queue name', () => {
    const spy = jest.fn();
    const factory = new RabbitMqSingletonConnectionFactory(logger, config);
    const consumer = new RabbitMqConsumer(logger, factory)
    return consumer.subscribe<IMessage>(queueName, spy).then((s) => BPromise.delay(500, s))
      .then((disposer) => {
        expect(disposer).toBeTruthy();

        expect(spy).not.toBeCalled();

        return disposer().then(expect.any);
      });
  });

  it('Consumer should subscribe and dispose ok with queue config', () => {
    const spy = jest.fn(); 
    const factory = new RabbitMqSingletonConnectionFactory(logger, config);
    const consumer = new RabbitMqConsumer(logger, factory)
    return consumer.subscribe<IMessage>(new DefaultQueueNameConfig(queueName), spy).then((s) => BPromise.delay(500, s))
      .then((disposer) => {
        expect(disposer).toBeTruthy();

        expect(spy).not.toBeCalled();

        return disposer().then(expect.any);
      });
  });

  it('Consumer should recieve message from Producer', (done) => {
    const spy = jest.fn();
    const factory = new RabbitMqSingletonConnectionFactory(logger, config);
    const consumer = new RabbitMqConsumer(logger, factory)
    return consumer.subscribe<IMessage>(queueName, spy).then((disposer) => {
      const producer = new RabbitMqProducer(logger, factory)
      const msg: IMessage = { data: 'time', value: new Date().getTime() };

      return producer.publish<IMessage>(queueName, msg)
        .then(() => BPromise.delay(500))
        .then(() => {
          expect(spy).toHaveBeenCalledTimes(1);
          const consumedMsg = spy.mock.calls[0][0] as IMessage;
          expect(consumedMsg.data).toBeTruthy();
          expect(consumedMsg.data).toEqual(msg.data);
          expect(consumedMsg.value).toBeTruthy();
          expect(consumedMsg.value).toEqual(msg.value);
          disposer();
          done();
        });
    })
  });

  it('Consumer should DLQ message from Producer if action fails', () => {
    const factory = new RabbitMqSingletonConnectionFactory(logger, config);
    const consumer = new RabbitMqConsumer(logger, factory)
    return consumer.subscribe<IMessage>(queueName, (m) => Promise.reject(new Error('Test Case Error: to fail consumer subscriber message handler')))
      .then((disposer) => {
        const producer = new RabbitMqProducer(logger, factory)
        const msg: IMessage = { data: 'time', value: new Date().getTime() };
        return producer.publish<IMessage>(queueName, msg)
          .then(() => BPromise.delay(500))
          .then(disposer);
      })
  });
})
