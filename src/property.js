// build-dependencies: observable
// build-dependencies: describe
// build-dependencies: functionconstruction
// build-dependencies: updatebarrier
// build-dependencies: dispatcher
// build-dependencies: optional
// build-dependencies: helpers
// build-dependencies: _

function PropertyDispatcher(property, subscribe, handleEvent) {
  Dispatcher.call(this, subscribe, handleEvent);
  this.property = property;
  this.current = None;
  this.currentValueRootId = undefined;
  this.propertyEnded = false;
}

inherit(PropertyDispatcher, Dispatcher);
extend(PropertyDispatcher.prototype, {
  push(event) {
    if (event.isEnd()) {
      this.propertyEnded = true;
    }
    if (event.hasValue()) {
      this.current = new Some(event);
      this.currentValueRootId = UpdateBarrier.currentEventId();
    }
    return Dispatcher.prototype.push.call(this, event);
  },

  maybeSubSource(subscription, reply, internal) {
    if (reply === Bacon.noMore) {
      return nop;
    } else if (this.propertyEnded) {
      subscription.handleEvent(endEvent());
      return nop;
    } else {
      return Dispatcher.prototype.subscribe.call(this, subscription, internal);
    }
  },

  subscribe(sink, internal = false) {
    const subscription = this._toSubscription(sink);
    var initSent = false;
    // init value is "bounced" here because the base Dispatcher class
    // won't add more than one subscription to the underlying observable.
    // without bouncing, the init value would be missing from all new subscribers
    // after the first one
    var reply = Bacon.more;

    if (this.current.isDefined && (this.hasSubscribers() || this.propertyEnded)) {
      // should bounce init value
      var dispatchingId = UpdateBarrier.currentEventId();
      var valId = this.currentValueRootId;
      if (!this.propertyEnded && valId && dispatchingId && dispatchingId !== valId) {
        // when subscribing while already dispatching a value and this property hasn't been updated yet
        // we cannot bounce before this property is up to date.
        //console.log "bouncing with possibly stale value", event.value(), "root at", valId, "vs", dispatchingId
        UpdateBarrier.whenDoneWith(this.property, () => {
          if (this.currentValueRootId === valId) {
            return subscription.handleEvent(initialEvent(this.current.get().value()));
          }
        });
        // the subscribing thing should be defered
        return this.maybeSubSource(subscription, reply, internal);
      } else {
        //console.log "bouncing value immediately"
        UpdateBarrier.inTransaction(undefined, this, function() {
          reply = subscription.handleEvent(initialEvent(this.current.get().value()));
          return reply;
        }, []);
        return this.maybeSubSource(subscription, reply, internal);
      }
    } else {
      return this.maybeSubSource(subscription, reply, internal);
    }
  }
});

function Property(desc, subscribe, handler) {
  Observable.call(this, desc);
  if (!subscribe._isDispatcher) {
    assertFunction(subscribe);
  }

  this.dispatcher = new PropertyDispatcher(this, subscribe, handler);
  registerObs(this);
}

inherit(Property, Observable);
extend(Property.prototype, {
  _isProperty: true,

  changes() {
    return new EventStream(new Bacon.Desc(this, "changes", []), this.dispatcher, function(event) {
      if (!event.isInitial()) {
        return this.push(event);
      }
    });
  },

  withHandler(handler) {
    return new Property(new Bacon.Desc(this, "withHandler", [handler]), this.dispatcher, handler);
  },

  toProperty() {
    assertNoArguments(arguments);
    return this;
  },

  toEventStream() {
    return new EventStream(new Bacon.Desc(this, "toEventStream", []), (sink) => {
      return this.dispatcher.subscribe(function(event) {
        if (event.isInitial()) { event = event.toNext(); }
        return sink(event);
      });
    });
  }
});

Bacon.Property = Property;

Bacon.constant = function(value) {
  return new Property(new Bacon.Desc(Bacon, "constant", [value]), function(sink) {
    sink(initialEvent(value));
    sink(endEvent());
    return nop;
  });
};
