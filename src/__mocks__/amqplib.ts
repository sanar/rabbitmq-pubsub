/**
 * amqplib.js
 *
 * Distributed under terms of the MIT license.
 * @module amqplib.js
 */

export const channel = {
  assertQueue: jest.fn(() => true),
  sendToQueue: jest.fn(() => true),
  consume: jest.fn(() => true),
  prefetch: () => true,
  assertExchange: jest.fn(() => true),
  bindQueue: jest.fn(() => true),
};

export const connection = {
  createChannel: jest.fn(() => Promise.resolve(channel)),
};

export const connect = jest.fn(() => connection);

export default { connect };
