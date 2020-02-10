import {
  Action,
  Component,
  ComponentConfig,
  CoreResponse,
  JovoWebClient,
  RepromptTimer,
  RequestEvents,
} from '../..';

export interface ResponseComponentConfig extends ComponentConfig {
  reprompt: {
    interval: number;
    maxAttempts: number;
  };
}

export class ResponseComponent extends Component<ResponseComponentConfig> {
  readonly name = 'ResponseComponent';

  static DEFAULT_CONFIG: ResponseComponentConfig = {
    reprompt: {
      interval: 2000,
      maxAttempts: 3,
    },
  };

  private readonly $repromptTimer: RepromptTimer;

  constructor(
    protected readonly $client: JovoWebClient,
    protected readonly $initConfig?: Partial<ResponseComponentConfig>,
  ) {
    super($client, $initConfig);
    this.$repromptTimer = new RepromptTimer($client);
  }

  async onInit(): Promise<void> {
    this.$client.on(RequestEvents.Data, this.onRequest.bind(this));
    this.$client.on(RequestEvents.Success, this.onResponse.bind(this));
  }

  getDefaultConfig(): ResponseComponentConfig {
    return ResponseComponent.DEFAULT_CONFIG;
  }

  private async onRequest() {
    this.$repromptTimer.abort();
    this.$client.audioPlayer.stopAll();
    this.$client.speechSynthesizer.stop();
    this.$client.input.abortRecording();
  }

  private async onResponse(data: CoreResponse) {
    if (this.$client.$config.debugMode) {
      // tslint:disable-next-line:no-console
      console.log('[RES]', data);
    }

    const actions = data.actions;
    if (actions.length > 0) {
      await this.handleActions(actions);
    }

    const repromptActions = data.reprompts;
    if (repromptActions && repromptActions.length > 0) {
      this.handleRepromptActions(repromptActions);
    }
  }

  private async handleActions(actions: Action[]) {
    for (let i = 0, len = actions.length; i < len; i++) {
      await this.$client.actionHandler.handleAction(actions[i]);
    }
  }

  private handleRepromptActions(actions: Action[]) {
    this.$repromptTimer.handle(actions);
  }
}
