// build-dependencies: _
// build-dependencies: updatebarrier

function Dispatcher(_subscribe, _handleEvent) {
  this._subscribe = _subscribe;
  this._handleEvent = _handleEvent;
  this.pushing = false;
  this.ended = false;
  this.prevError = undefined;
  this.unsubSrc = undefined;
  this.subscriptions = [];
  this.queue = [];
}

Dispatcher.prototype._isDispatcher = true;

Dispatcher.prototype.hasSubscribers = function() {
  return this.subscriptions.length > 0;
};

Dispatcher.prototype.removeSub = function(subscription) {
  this.subscriptions = _.without(subscription, this.subscriptions);
  return this.subscriptions;
};

Dispatcher.prototype.unsubscribe = function(subscription) {
  this.removeSub(subscription);
  if (!this.hasSubscribers()) {
    return this.unsubscribeFromSource();
  }
};

Dispatcher.prototype.push = function(event) {
  if (event.isEnd()) {
    this.ended = true;
  }
  return UpdateBarrier.inTransaction(event, this, this.pushIt, [event]);
};

Dispatcher.prototype.pushToSubscriptions = function(event) {
  try {
    let tmp = this.subscriptions;
    const len = tmp.length;
    for (let i = 0; i < len; i++) {
      const sub = tmp[i];
      let reply = sub.handleEvent(event);
      if (reply === Bacon.noMore || event.isEnd()) {
        this.removeSub(sub);
      }
    }
    return true;
  } catch (error) {
    this.pushing = false;
    this.queue = []; // ditch queue in case of exception to avoid unexpected behavior
    throw error;
  }
};

Dispatcher.prototype.pushIt = function(event) {
  if (!this.pushing) {
    if (event === this.prevError) {
      return;
    }
    if (event.isError()) {
      this.prevError = event;
    }
    this.pushing = true;
    this.pushToSubscriptions(event);
    this.pushing = false;
    while (this.queue.length) {
      event = this.queue.shift();
      this.push(event);
    }
    if (this.hasSubscribers()) {
      return Bacon.more;
    } else {
      this.unsubscribeFromSource();
      return Bacon.noMore;
    }
  } else {
    this.queue.push(event);
    return Bacon.more;
  }
};

Dispatcher.prototype.handleEvent = function(event) {
  if (this._handleEvent) {
    return this._handleEvent(event);
  } else {
    return this.push(event);
  }
};

Dispatcher.prototype.unsubscribeFromSource = function() {
  if (this.unsubSrc === true) {
    this._subscribe.unsubscribe(this);
  } else if (this.unsubSrc && this.unsubSrc.unsubscribe) {
    this.unsubSrc.unsubscribe();
  } else if(this.unsubSrc) {
    this.unsubSrc();
  }
  this.unsubSrc = undefined;
};

Dispatcher.prototype._toSubscription = function(sink) {
  if (sink._isDispatcher) {
    return sink;
  } else if (sink._isSubscription) {
    return sink;
  } else {
    assertFunction(sink);
    return {
      _isSubscription: true,
      handleEvent: sink
    };
  }
};

Dispatcher.prototype.subscribe = function(sink, internal = false) {
  const subscription = this._toSubscription(sink);
  if (this.ended) {
    subscription.handleEvent(endEvent());
    return nop;
  } else {
    this.subscriptions.push(subscription);
    if (this.subscriptions.length === 1) {
      if (this._subscribe._isDispatcher) {
        this._subscribe.subscribe(this, true);
        this.unsubSrc = true;
      } else {
        this.unsubSrc = this._subscribe(_.bind(this.handleEvent, this));
        if (this.unsubSrc && !this.unsubSrc.unsubscribe) {
          assertFunction(this.unsubSrc);
        }
      }
    }

    if (internal) {
      return nop;
    } else {
      return () => this.unsubscribe(subscription);
    }
  }
};

Bacon.Dispatcher = Dispatcher;
