/**
 * queue-name-config.ts
 *
 * Distributed under terms of the MIT license.
 * @author Edgard Leal <edgardleal@gmail.com>
 * @module queue-name-config.ts
 */

export interface IQueueNameConfig {
  name: string;
  dlq: string;
  dlx: string;
}

export class DefaultQueueNameConfig implements IQueueNameConfig {
  dlq: string;

  dlx: string;

  constructor(public name: string) {
    this.dlq = `${name}.DLQ`;
    this.dlx = `${this.dlq}.Exchange`
  }
}
