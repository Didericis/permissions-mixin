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

const USER = {
    username: 'user',
    password: 'password'
};

const testCollection = new Mongo.Collection('test');

const allowAdminMethod = new ValidatedMethod({
    name: 'allowAdminMethod',
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
    name: 'allowBasicMethod',
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
    name: 'allowBasicIfBlah',
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
    name: 'allowFancyMethod',
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
    name: 'noAllowOrDenyMethod',
    mixins: [PermissionsMixin],
    validate: new SimpleSchema({
        text: { type: String }
    }).validator(),
    run({text}) {
        return testCollection.insert({text: text});
    }
});

const nestedAllowAdminMethod = new ValidatedMethod({
    name: 'nestedAllowAdminMethod',
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
    name: 'allowAnyMethod',
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
    name: 'denyBasicMethod',
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
    name: 'denyBasicIfBlahAndFancy',
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

const allowLoggedIn = new ValidatedMethod({
    name: 'allowLoggedIn',
    mixins: [PermissionsMixin],
    allow: [{
        roles: true,
        group: true
    }],
    validate: new SimpleSchema({
        text: { type: String }
    }).validator(),
    run({text}) {
        return testCollection.insert({text: text});
    }
});

const allowLoggedInSpecialDef = new ValidatedMethod({
    name: 'allowLoggedInSpecialDef',
    mixins: [PermissionsMixin],
    allow: PermissionsMixin.LoggedIn,
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

const canCallWhen = function canCallWhen(method, input) {
    it(`can call "${method.name}" when input is ${input}`, (done) => {
        const simulation = method.call({text: input},
            (err, server) => {
            assert.isDefined(server);
            assert.isDefined(simulation);
            assert.equal(server, simulation);
            done();
        });
    });
};

const cannotCallWhen = function cannotCallWhen(method, input) {
    it(`CANNOT call "${method.name}" when input is ${input}`, () => {
        assert.throws(() => {
            method.call({text: input});
        }, method.permissionsError);
    });
};

const setupUserTest = function setupUser(user) {
    before((done) => {
        Meteor.call('test.createUsers', [user], () => {
            Meteor.loginWithPassword(user.username,
                user.password, done);
        });
    });

    beforeEach((done) => {
        Meteor.call('test.resetDatabase', () => { done(); });
    });
};

const tearDownUserTest = function tearDownUserTest(user) {
    after((done) => { Meteor.logout(done); });
}

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
        setupUserTest(BASICUSER);

        cannotCallWhen(allowAdminMethod, 'sample');
        cannotCallWhen(nestedAllowAdminMethod, 'sample');
        cannotCallWhen(allowFancyMethod, 'sample');
        cannotCallWhen(denyBasicMethod, 'sample');
        canCallWhen(allowBasicMethod, 'sample');
        canCallWhen(allowAnyMethod, 'sample');
        canCallWhen(allowBasicIfBlah, 'blah');
        cannotCallWhen(allowBasicIfBlah, 'sample');
        canCallWhen(denyBasicIfBlahAndFancy, 'sample');
        cannotCallWhen(denyBasicIfBlahAndFancy, 'blah');
        canCallWhen(allowLoggedIn, 'sample');
        canCallWhen(allowLoggedInSpecialDef, 'sample');

        tearDownUserTest();
    });

    describe('ADMIN', () => {
        setupUserTest(ADMIN);

        canCallWhen(allowAdminMethod, 'sample');
        canCallWhen(nestedAllowAdminMethod, 'sample');
        canCallWhen(allowFancyMethod, 'sample');
        canCallWhen(denyBasicMethod, 'sample');
        canCallWhen(allowBasicMethod, 'sample');
        canCallWhen(allowAnyMethod, 'sample');
        canCallWhen(allowBasicIfBlah, 'blah');
        canCallWhen(allowBasicIfBlah, 'sample');
        canCallWhen(denyBasicIfBlahAndFancy, 'sample');
        canCallWhen(allowLoggedIn, 'sample');
        canCallWhen(allowLoggedInSpecialDef, 'sample');

        tearDownUserTest();
    });

    describe('FANCYUSER', () => {
        setupUserTest(FANCYUSER);

        cannotCallWhen(allowAdminMethod, 'sample');
        cannotCallWhen(nestedAllowAdminMethod, 'sample');
        canCallWhen(allowFancyMethod, 'sample');
        cannotCallWhen(denyBasicMethod, 'sample');
        canCallWhen(allowBasicMethod, 'sample');
        canCallWhen(allowAnyMethod, 'sample');
        canCallWhen(allowBasicIfBlah, 'blah');
        cannotCallWhen(allowBasicIfBlah, 'sample');
        cannotCallWhen(denyBasicIfBlahAndFancy, 'blah');
        cannotCallWhen(denyBasicIfBlahAndFancy, 'sample');
        canCallWhen(allowLoggedIn, 'sample');
        canCallWhen(allowLoggedInSpecialDef, 'sample');

        tearDownUserTest();
    });

    describe('USER', () => {
        setupUserTest(USER);

        cannotCallWhen(allowAdminMethod, 'sample');
        cannotCallWhen(nestedAllowAdminMethod, 'sample');
        cannotCallWhen(allowFancyMethod, 'sample');
        canCallWhen(denyBasicMethod, 'sample');
        cannotCallWhen(allowBasicMethod, 'sample');
        canCallWhen(allowAnyMethod, 'sample');
        cannotCallWhen(allowBasicIfBlah, 'blah');
        cannotCallWhen(allowBasicIfBlah, 'sample');
        canCallWhen(denyBasicIfBlahAndFancy, 'blah');
        canCallWhen(denyBasicIfBlahAndFancy, 'sample');
        canCallWhen(allowLoggedIn, 'sample');
        canCallWhen(allowLoggedInSpecialDef, 'sample');

        tearDownUserTest();
    });

    describe('NO USER', () => {
        cannotCallWhen(allowAdminMethod, 'sample');
        cannotCallWhen(nestedAllowAdminMethod, 'sample');
        cannotCallWhen(allowFancyMethod, 'sample');
        cannotCallWhen(denyBasicMethod, 'sample');
        cannotCallWhen(allowBasicMethod, 'sample');
        canCallWhen(allowAnyMethod, 'sample');
        cannotCallWhen(allowBasicIfBlah, 'blah');
        cannotCallWhen(allowBasicIfBlah, 'sample');
        cannotCallWhen(denyBasicIfBlahAndFancy, 'blah');
        cannotCallWhen(denyBasicIfBlahAndFancy, 'sample');
        cannotCallWhen(allowLoggedIn, 'sample');
        cannotCallWhen(allowLoggedInSpecialDef, 'sample');

        tearDownUserTest();
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
