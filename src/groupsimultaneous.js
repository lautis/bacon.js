// build-dependencies: source
// build-dependencies: when

Bacon.groupSimultaneous = function(...streams) {
  if (streams.length === 1 && isArray(streams[0])) {
    streams = streams[0];
  }

  var sources = _.map((stream) => new BufferingSource(stream), streams);
  return withDesc(new Bacon.Desc(Bacon, "groupSimultaneous", streams), Bacon.when(sources, (function(...xs) { return xs; })));
};
