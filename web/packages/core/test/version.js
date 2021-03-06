const { assert } = require("chai");
const { Version } = require("../src/version");

// Each row should be a list of compatible versions.
// Earlier entries in a row should be "greater than" later entries in the same row.
// Earlier rows should be "greater than" later rows.
// Rows should be incompatible with other rows.
const testMatrix = [
    ["3.6-pre1", "3.5.4", "3.2.3", "3"],
    ["2.5", "2.2.6", "2.2.4", "2.2.3"],
    [
        "1",
        "1-rc.1",
        "1-beta.11",
        "1-beta.2",
        "1-beta.01",
        "1-beta",
        "1-alpha.beta",
        "1-alpha.1",
        "1-alpha",
    ],
    ["0.1.2", "0.1.1-dev", "0.1"],
    ["0.0.2", "0.0.2-dev", "0.0.2+build"],
    ["0.0.1", "0.0.1-dev", "0.0.1-5", "0.0.1-2"],
];

function flatten(arr) {
    return arr.reduce(function (flat, toFlatten) {
        return flat.concat(
            Array.isArray(toFlatten) ? flatten(toFlatten) : toFlatten
        );
    }, []);
}

describe("Version", function () {
    describe("#from_semver()", function () {
        it("should parse valid semver strings", function () {
            assert.deepEqual(
                Version.from_semver("1.2"),
                new Version(1, 2, 0, undefined, undefined)
            );
            assert.deepEqual(
                Version.from_semver("1.2.3"),
                new Version(1, 2, 3, undefined, undefined)
            );
            assert.deepEqual(
                Version.from_semver("1.09.3"),
                new Version(1, 9, 3, undefined, undefined)
            );
            assert.deepEqual(
                Version.from_semver("1.2.3-pr"),
                new Version(1, 2, 3, ["pr"], undefined)
            );
            assert.deepEqual(
                Version.from_semver("1.2.3-pr1.pr2"),
                new Version(1, 2, 3, ["pr1", "pr2"], undefined)
            );
            assert.deepEqual(
                Version.from_semver("1.2.3+build"),
                new Version(1, 2, 3, undefined, ["build"])
            );
            assert.deepEqual(
                Version.from_semver("1.2.3+build1.build2"),
                new Version(1, 2, 3, undefined, ["build1", "build2"])
            );
            assert.deepEqual(
                Version.from_semver("1-pr1.pr2+build1.build2"),
                new Version(1, 0, 0, ["pr1", "pr2"], ["build1", "build2"])
            );
        });
    });

    describe("#is_compatible_with()", function () {
        it("is compatible with similar versions", function () {
            for (let test of testMatrix) {
                for (let a of test) {
                    for (let b of test) {
                        assert.isOk(
                            Version.from_semver(a).is_compatible_with(
                                Version.from_semver(b)
                            ),
                            `${a} is compatible with ${b}`
                        );
                    }
                }
            }
        });
        it("is not compatible with other versions", function () {
            for (let test of testMatrix) {
                for (let a of test) {
                    for (let otherTest of testMatrix) {
                        if (test === otherTest) continue;
                        for (let b of otherTest) {
                            assert.isNotOk(
                                Version.from_semver(a).is_compatible_with(
                                    Version.from_semver(b)
                                ),
                                `${a} is not compatible with ${b}`
                            );
                        }
                    }
                }
            }
        });
    });

    describe("#has_precedence_over()", function () {
        it("returns true when it should", function () {
            const tests = flatten(testMatrix);
            for (let a = 0; a < tests.length; a++) {
                for (let b = a + 1; b < tests.length; b++) {
                    if (
                        tests[a].indexOf("+") > -1 ||
                        tests[b].indexOf("+") > -1
                    ) {
                        // Skip "builds" for purposes of this test.
                        continue;
                    }
                    assert.isOk(
                        Version.from_semver(tests[a]).has_precedence_over(
                            Version.from_semver(tests[b])
                        ),
                        `${tests[a]} has precedence over ${tests[b]}`
                    );
                }
            }
        });
        it("returns false when it should", function () {
            const tests = flatten(testMatrix).reverse();
            for (let a = 0; a < tests.length; a++) {
                for (let b = a + 1; b < tests.length; b++) {
                    if (
                        tests[a].indexOf("+") > -1 ||
                        tests[b].indexOf("+") > -1
                    ) {
                        // Skip "builds" for purposes of this test.
                        continue;
                    }
                    assert.isNotOk(
                        Version.from_semver(tests[a]).has_precedence_over(
                            Version.from_semver(tests[b])
                        ),
                        `${tests[a]} doesn't have precedence over ${tests[b]}`
                    );
                }
            }
        });
    });

    describe("#is_equal()", function () {
        it("returns true when it should", function () {
            const tests = flatten(testMatrix);
            for (let version of tests) {
                assert.isOk(
                    Version.from_semver(version).is_equal(
                        Version.from_semver(version)
                    ),
                    `${version} is equal to itself`
                );
            }
        });
        it("returns false when it should", function () {
            const tests = flatten(testMatrix).reverse();
            for (let a = 0; a < tests.length; a++) {
                for (let b = a + 1; b < tests.length; b++) {
                    if (
                        tests[a].indexOf("+") > -1 ||
                        tests[b].indexOf("+") > -1 ||
                        tests[a].indexOf("-") > -1 ||
                        tests[b].indexOf("-") > -1
                    ) {
                        // Skip "builds" and "identifiers" for purposes of this test.
                        continue;
                    }
                    assert.isNotOk(
                        Version.from_semver(tests[a]).is_equal(
                            Version.from_semver(tests[b])
                        ),
                        `${tests[a]} does not equal ${tests[b]}`
                    );
                }
            }
        });
    });

    describe("#is_stable_or_compatible_prerelease()", function () {
        it("returns true for own versions", function () {
            const tests = flatten(testMatrix);
            for (let version of tests) {
                assert.isOk(
                    Version.from_semver(
                        version
                    ).is_stable_or_compatible_prerelease(
                        Version.from_semver(version)
                    ),
                    `${version} is compatible with itself`
                );
            }
        });
        it("returns true for compatible pre-releases", function () {
            const tests = ["1.2.3", "1.2.3-alpha", "1.2.3-beta1.build2"];
            for (let a of tests) {
                for (let b of tests) {
                    assert.isOk(
                        Version.from_semver(
                            a
                        ).is_stable_or_compatible_prerelease(
                            Version.from_semver(b)
                        ),
                        `${a} is compatible with ${b}`
                    );
                }
            }
        });
        it("returns false for incompatible pre-releases", function () {
            const tests = ["1-dev", "1.2-alpha", "1.2.3-beta1.build2"];
            for (let a of tests) {
                for (let b of tests) {
                    if (a === b) continue;
                    assert.isNotOk(
                        Version.from_semver(
                            a
                        ).is_stable_or_compatible_prerelease(
                            Version.from_semver(b)
                        ),
                        `${a} is not compatible with ${b}`
                    );
                }
            }
        });
    });
});
