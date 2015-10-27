// build-dependencies: core, argumentstoobservables
// build-dependencies: compositeunsubscribe

Bacon.EventStream.prototype.merge = function(right) {
  assertEventStream(right);
  var left = this;
  return withDesc(new Bacon.Desc(left, "merge", [right]), Bacon.mergeAll(this, right));
};

Bacon.mergeAll = function() {
  var streams = argumentsToObservables(arguments);
  if (streams.length) {
    return new EventStream(new Bacon.Desc(Bacon, "mergeAll", streams), function(sink) {
      var ends = 0;
      var smartSink = function(obs) {
        return function(unsubBoth, unsubMe, composite) {
          return obs.dispatcher.subscribe(function(event) {
            if (event.isEnd()) {
              ends++;
              if (ends === streams.length) {
                return sink(endEvent());
              } else {
                return Bacon.more;
              }
            } else {
              var reply = sink(event);
              if (reply === Bacon.noMore) { composite.unsubscribe(); }
              return reply;
            }
          });
        };
      };
      var sinks = _.map(smartSink, streams);
      return new Bacon.CompositeUnsubscribe(sinks);
    });
  } else {
    return Bacon.never();
  }
};
