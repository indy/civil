suite('Array', function () {
  setup(function () {
    // ...
  });

  suite('#indexOf()', function () {
    test('should return -1 when not present', function () {
      chai.assert.equal(-1, [1, 2, 3].indexOf(4));
    });
  });
});
