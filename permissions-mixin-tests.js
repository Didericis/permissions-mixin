const ADMIN = {
    username: 'admin',
    password: 'password',
    roles: ['admin']
};

const FANCYUSER = {
    username: 'fancy',
    password: 'password',
    roles: ['fancy', 'basic']
};

const BASICUSER = {
    username: 'basic',
    password: 'password',
    roles: ['basic']
};

const testCollection = new Mongo.Collection('test');

const allowAdminMethod = new ValidatedMethod({
    name: 'AdminMethod',
    mixins: [PermissionsMixin],
    allow: [{
        roles: ['admin'],
        group: Roles.GLOBAL_GROUP
    }],
    validate: new SimpleSchema({
        text: { type: String }
    }).validator(),
    run({text}) {
        return testCollection.insert({text: text});
    }
});

const allowBasicMethod = new ValidatedMethod({
    name: 'BasicMethod',
    mixins: [PermissionsMixin],
    allow: [{
        roles: ['basic', 'admin'],
        group: Roles.GLOBAL_GROUP
    }],
    validate: new SimpleSchema({
        text: { type: String }
    }).validator(),
    run({text}) {
        return testCollection.insert({text: text});
    }
});

const allowBasicIfBlah = new ValidatedMethod({
    name: 'AllowBasicIfBlah',
    mixins: [PermissionsMixin],
    allow: [{
        roles: ['basic'],
        group: Roles.GLOBAL_GROUP,
        allow({text}) { return (text === 'blah'); }
    }, {
        roles: ['admin'],
        group: Roles.GLOBAL_GROUP
    }],
    validate: new SimpleSchema({
        text: { type: String }
    }).validator(),
    run({text}) {
        return testCollection.insert({text: text});
    }
});

const allowFancyMethod = new ValidatedMethod({
    name: 'FancyMethod',
    mixins: [PermissionsMixin],
    allow: [{
        roles: ['fancy', 'admin'],
        group: Roles.GLOBAL_GROUP
    }],
    validate: new SimpleSchema({
        text: { type: String }
    }).validator(),
    run({text}) {
        return testCollection.insert({text: text});
    }
});

const noAllowOrDenyMethod = new ValidatedMethod({
    name: 'NoMethod',
    mixins: [PermissionsMixin],
    validate: new SimpleSchema({
        text: { type: String }
    }).validator(),
    run({text}) {
        return testCollection.insert({text: text});
    }
});

const nestedAllowAdminMethod = new ValidatedMethod({
    name: 'NestedMethod',
    mixins: [PermissionsMixin],
    allow: [{
        roles: ['fancy', 'admin', 'basic'],
        group: Roles.GLOBAL_GROUP
    }],
    validate: new SimpleSchema({
        text: { type: String }
    }).validator(),
    run({text}) {
        return allowAdminMethod.run.call(this, {text: text});
    }
});

const allowAnyMethod = new ValidatedMethod({
    name: 'AllowAny',
    mixins: [PermissionsMixin],
    allow: true,
    validate: new SimpleSchema({
        text: { type: String }
    }).validator(),
    run({text}) {
        return testCollection.insert({text: text});
    }
});

const denyBasicMethod = new ValidatedMethod({
    name: 'DenyBasicMethod',
    mixins: [PermissionsMixin],
    deny: [{
        roles: ['basic'],
        group: Roles.GLOBAL_GROUP
    }],
    validate: new SimpleSchema({
        text: { type: String }
    }).validator(),
    run({text}) {
        return testCollection.insert({text: text});
    }
});

const denyBasicIfBlahAndFancy = new ValidatedMethod({
    name: 'DenyBasicIfBlah',
    mixins: [PermissionsMixin],
    deny: [{
        roles: ['basic'],
        group: Roles.GLOBAL_GROUP,
        deny({text}) { return (text === 'blah'); }
    }, {
        roles: ['fancy'],
        group: Roles.GLOBAL_GROUP
    }],
    validate: new SimpleSchema({
        text: { type: String }
    }).validator(),
    run({text}) {
        return testCollection.insert({text: text});
    }
});

Meteor.methods({
  'test.resetDatabase': () => {
      testCollection.remove({});
  },
  'test.createUsers': (users) => {
      if (Meteor.isServer) {
          if (Meteor.users.find().count() > 0) { Meteor.users.remove({}); }

          users.forEach(({username, password, roles}) => {
              const userId = Accounts.createUser({
                  username: username,
                  password: password
              });

              if (roles) {
                  Roles.addUsersToRoles(userId, roles, Roles.GLOBAL_GROUP);
              }
          });
      }
  }
});

describe('No users', () => {
    beforeEach((done) => {
        Meteor.call('test.resetDatabase', () => { done(); });
    });

    it('should add a runTrusted function', () => {
        assert.isDefined(noAllowOrDenyMethod.runTrusted);
    });

    it('should not allow "noAllowOrDenyMethod" to be run', () => {
        assert.throws(() => {
            noAllowOrDenyMethod.call({text: 'hi'});
        }, noAllowOrDenyMethod.permissionsError);
    });

    it('should not be able to call methods by modifying isTrusted', () => {
        assert.throws(() => {
            allowAdminMethod.call.apply({isTrusted: true}, {num: 1});
        }, allowAdminMethod.permissionsError);
    });
});

describe('Bad definitions', () => {
    beforeEach((done) => {
        Meteor.call('test.resetDatabase', () => { done(); });
    });

    it('should throw an error if empty deny array in definition', () => {
        assert.throws(() => {
            new ValidatedMethod({
                name: 'testMethod1',
                mixins: [PermissionsMixin],
                deny: [],
                validate: new SimpleSchema({
                    text: { type: String }
                }).validator(),
                run({text}) {
                    return testCollection.insert({text: text});
                }
            });
        }, 'PermssionsMixin.Definition');
    });

    it('should throw an error if empty allow array in definition', () => {
        assert.throws(() => {
            new ValidatedMethod({
                name: 'testMethod2',
                mixins: [PermissionsMixin],
                allow: [],
                validate: new SimpleSchema({
                    text: { type: String }
                }).validator(),
                run({text}) {
                    return testCollection.insert({text: text});
                }
            });
        }, 'PermssionsMixin.Definition');
    });

    it('should throw an error if allow doc does not have a role', () => {
        assert.throws(() => {
            new ValidatedMethod({
                name: 'testMethod3',
                mixins: [PermissionsMixin],
                allow: [{
                    group: Roles.GLOBAL_GROUP
                }],
                validate: new SimpleSchema({
                    text: { type: String }
                }).validator(),
                run({text}) {
                    return testCollection.insert({text: text});
                }
            });
        }, 'PermssionsMixin.Definition');
    });

    it('should throw an error if deny doc does not have a role', () => {
        assert.throws(() => {
            new ValidatedMethod({
                name: 'testMethod4',
                mixins: [PermissionsMixin],
                deny: [{
                    group: Roles.GLOBAL_GROUP
                }],
                validate: new SimpleSchema({
                    text: { type: String }
                }).validator(),
                run({text}) {
                    return testCollection.insert({text: text});
                }
            });
        }, 'PermssionsMixin.Definition');
    });
});

if (Meteor.isClient) {
    describe('BASICUSER', () => {
        before((done) => {
            if (Meteor.isClient) {
                Meteor.logout(() => {
                    Meteor.call('test.createUsers', [BASICUSER], () => {
                        Meteor.loginWithPassword(BASICUSER.username,
                            BASICUSER.password, done);
                    });
                });
            }
            if (Meteor.isServer) {
                done();
            }
        });

        beforeEach((done) => {
            Meteor.call('test.resetDatabase', () => { done(); });
        });

        if (Meteor.isClient) {
            it('CANNOT call "allowAdminMethod"', () => {
                assert.throws(() => {
                    allowAdminMethod.call({text: 'sample'});
                }, allowAdminMethod.permissionsError);
            });

            it('CANNOT call "nestedAllowAdminMethod"', () => {
                assert.throws(() => {
                    nestedAllowAdminMethod.call({text: 'sample'});
                }, allowAdminMethod.permissionsError);
            });

            it('CANNOT call "allowFancyMethod"', () => {
                assert.throws(() => {
                    allowFancyMethod.call({text: 'sample'});
                }, allowFancyMethod.permissionsError);
            });

            it('CANNOT call "denyBasicMethod"', () => {
                assert.throws(() => {
                    denyBasicMethod.call({text: 'sample'});
                }, denyBasicMethod.permissionsError);
            });

            it('can call "allowBasicMethod"', (done) => {
                const simulation = allowBasicMethod.call({text: 'sample'},
                    (err, server) => {
                    assert.isDefined(server);
                    assert.isDefined(simulation);
                    assert.equal(server, simulation);
                    done();
                });
            });

            it('can call "allowAnyMethod"', (done) => {
                const simulation = allowAnyMethod.call({text: 'sample'},
                    (err, server) => {
                    assert.isDefined(server);
                    assert.isDefined(simulation);
                    assert.equal(server, simulation);
                    done();
                });
                assert.equal(1, 2);
            });

            it('can call "allowBasicIfBlah" when input is "blah"', (done) => {
                const simulation = allowBasicIfBlah.call({text: 'blah'},
                    (err, server) => {
                    assert.isDefined(server);
                    assert.isDefined(simulation);
                    assert.equal(server, simulation);
                    done();
                });
            });

            it('CANNOT call "allowBasicIfBlah" when input is "sample"', () => {
                assert.throws(() => {
                    allowBasicIfBlah.call({text: 'sample'});
                }, allowBasicIfBlah.permissionsError);
            });

            it('can call "denyBasicIfBlahAndFancy" when input is "sample"',
                (done) => {
                const simulation = denyBasicIfBlahAndFancy.call(
                    {text: 'sample'}, (err, server) => {
                    assert.isDefined(server);
                    assert.isDefined(simulation);
                    assert.equal(server, simulation);
                    done();
                });
            });

            it('CANNOT call "denyBasicIfBlahAndFancy" when input is "blah"',
                () => {
                assert.throws(() => {
                    denyBasicIfBlahAndFancy.call({text: 'blah'});
                }, denyBasicIfBlahAndFancy.permissionsError);
            });
        }
    });

    describe('ADMIN', () => {
        before((done) => {
            if (Meteor.isClient) {
                Meteor.logout(() => {
                    Meteor.call('test.createUsers', [ADMIN], () => {
                        Meteor.loginWithPassword(ADMIN.username,
                            ADMIN.password, done);
                    });
                });
            }
            if (Meteor.isServer) {
                done();
            }
        });

        beforeEach((done) => {
            Meteor.call('test.resetDatabase', () => { done(); });
        });

        it('can call "allowAdminMethod"', (done) => {
            const simulation = allowAdminMethod.call({text: 'sample'},
                (err, server) => {
                assert.isDefined(server);
                assert.isDefined(simulation);
                assert.equal(server, simulation);
                done();
            });
        });

        it('can call "nestedAllowAdminMethod"', (done) => {
            const simulation = nestedAllowAdminMethod.call({text: 'sample'},
                (err, server) => {
                assert.isDefined(server);
                assert.isDefined(simulation);
                assert.equal(server, simulation);
                done();
            });
        });

        it('can call "allowFancyMethod"', (done) => {
            const simulation = allowFancyMethod.call({text: 'sample'},
                (err, server) => {
                assert.isDefined(server);
                assert.isDefined(simulation);
                assert.equal(server, simulation);
                done();
            });
        });

        it('can call "denyBasicMethod"', (done) => {
            const simulation = denyBasicMethod.call({text: 'sample'},
                (err, server) => {
                assert.isDefined(server);
                assert.isDefined(simulation);
                assert.equal(server, simulation);
                done();
            });
        });

        it('can call "allowBasicMethod"', (done) => {
            const simulation = allowBasicMethod.call({text: 'sample'},
                (err, server) => {
                assert.isDefined(server);
                assert.isDefined(simulation);
                assert.equal(server, simulation);
                done();
            });
        });

        it('can call "allowAnyMethod"', (done) => {
            const simulation = allowAnyMethod.call({text: 'sample'},
                (err, server) => {
                assert.isDefined(server);
                assert.isDefined(simulation);
                assert.equal(server, simulation);
                done();
            });
        });

        it('can call "allowBasicIfBlah" if text is sample', (done) => {
            const simulation = allowBasicIfBlah.call({text: 'sample'},
                (err, server) => {
                assert.isDefined(server);
                assert.isDefined(simulation);
                assert.equal(server, simulation);
                done();
            });
        });

        it('can call "denyBasicIfBlahAndFancy" when input is "blah"', () => {
            const simulation = denyBasicIfBlahAndFancy.call({text: 'blah'},
                (err, server) => {
                assert.isDefined(server);
                assert.isDefined(simulation);
                assert.equal(server, simulation);
                done();
            });
        });

        it('can call "denyBasicIfBlahAndFancy" when input is "sample"', () => {
            const simulation = denyBasicIfBlahAndFancy.call({text: 'sample'},
                (err, server) => {
                assert.isDefined(server);
                assert.isDefined(simulation);
                assert.equal(server, simulation);
                done();
            });
        });
    });

    describe('FANCYUSER', () => {
        before((done) => {
            if (Meteor.isClient) {
                Meteor.logout(() => {
                    Meteor.call('test.createUsers', [FANCYUSER], () => {
                        Meteor.loginWithPassword(FANCYUSER.username,
                            FANCYUSER.password, done);
                    });
                });
            }
            if (Meteor.isServer) {
                done();
            }
        });

        beforeEach((done) => {
            Meteor.call('test.resetDatabase', () => { done(); });
        });

        it('CANNOT call "allowAdminMethod"', () => {
            assert.throws(() => {
                allowAdminMethod.call({text: 'sample'});
            }, 'PermissionsMixin.NotAllowed');
        });

        it('CANNOT call "nestedAllowAdminMethod"', () => {
            assert.throws(() => {
                nestedAllowAdminMethod.call({text: 'sample'});
            }, allowAdminMethod.permissionsError);
        });

        it('can call "allowFancyMethod"', (done) => {
            const simulation = allowFancyMethod.call({text: 'sample'},
                (err, server) => {
                assert.isDefined(server);
                assert.isDefined(simulation);
                assert.equal(server, simulation);
                done();
            });
        });

        it('CANNOT call "denyBasicMethod"', () => {
            assert.throws(() => {
                denyBasicMethod.call({text: 'sample'});
            }, denyBasicMethod.permissionsError);
        });

        it('can call "allowBasicMethod"', (done) => {
            const simulation = allowBasicMethod.call({text: 'sample'},
                (err, server) => {
                assert.isDefined(server);
                assert.isDefined(simulation);
                assert.equal(server, simulation);
                done();
            });
        });

        it('can call "allowAnyMethod"', (done) => {
            const simulation = allowAnyMethod.call({text: 'sample'},
                (err, server) => {
                assert.isDefined(server);
                assert.isDefined(simulation);
                assert.equal(server, simulation);
                done();
            });
        });

        it('can call "allowBasicIfBlah" when input is "blah"', (done) => {
            const simulation = allowBasicIfBlah.call({text: 'blah'},
                (err, server) => {
                assert.isDefined(server);
                assert.isDefined(simulation);
                assert.equal(server, simulation);
                done();
            });
        });

        it('CANNOT call "allowBasicIfBlah" when input is "sample"', () => {
            assert.throws(() => {
                allowBasicIfBlah.call({text: 'sample'});
            }, allowBasicIfBlah.permissionsError);
        });

        it('CANNOT call "denyBasicIfBlahAndFancy" when input is "blah"', () => {
            assert.throws(() => {
                denyBasicIfBlahAndFancy.call({text: 'blah'});
            }, denyBasicIfBlahAndFancy.permissionsError);
        });

        it('CANNOT call "denyBasicIfBlahAndFancy" when input is "sample"',
            () => {
            assert.throws(() => {
                denyBasicIfBlahAndFancy.call({text: 'sample'});
            }, denyBasicIfBlahAndFancy.permissionsError);
        });
    });
}

if (Meteor.isServer) {
    describe('Server', () => {
        it('should not allow methods to be run from server with run', () => {
            assert.throws(() => {
                allowAdminMethod.run({text: 'test'});
            }, allowAdminMethod.permissionsError);
        });

        it('should allow a method to be run from server with runTrusted',
            () => {
            const result = allowAdminMethod.runTrusted({text: 'test'});
            assert.isDefined(result);
        });

        it('should allow a nested method to be run from server with runTrusted',
            () => {
            const result = nestedAllowAdminMethod.runTrusted({text: 'test'});
            assert.isDefined(result);
        });
    });
}
