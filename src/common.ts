
import { IQueueNameConfig, DefaultQueueNameConfig } from './queue-name-config';

export class DefaultPubSubQueueConfig implements IQueueNameConfig {
  dlq: string;

  dlx: string;

  constructor(public name: string) {
    this.dlq = '';
    this.dlx = `${name}.DLQ.Exchange`
  }
}

function isQueueNameConfig(config: IQueueNameConfig | string) : config is IQueueNameConfig {
  if (
    (config as IQueueNameConfig).name
    && (config as IQueueNameConfig).dlq
    && (config as IQueueNameConfig).dlx
  ) {
    return true;
  }
  return false;
}

export function asQueueNameConfig(config: IQueueNameConfig | string) : IQueueNameConfig {
  return isQueueNameConfig(config) ? config : new DefaultQueueNameConfig(config);
}

export function asPubSubQueueNameConfig(config: IQueueNameConfig | string) : IQueueNameConfig {
  return isQueueNameConfig(config) ? config : new DefaultPubSubQueueConfig(config);
}
