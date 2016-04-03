# didericis:permissions-mixin [![Circle CI](https://circleci.com/gh/Didericis/permissions-mixin.svg?style=svg)](https://circleci.com/gh/Didericis/permissions-mixin)

This is a mixin for meteor's [mdg:validated-method](https://github.com/meteor/validated-method). It uses the [alanning:roles](https://github.com/alanning/meteor-roles) package and allows you to define what users with what roles are allowed or denied use of your method, and under what conditions. 

If you do not need to check for special conditions and would like a simpler way to check to see if a user is permitted to use certain methods, check out [tunifight:loggedin-mixin](https://atmospherejs.com/tunifight/loggedin-mixin).

## Install

```sh
$ meteor add didericis:permissions-mixin
```

## Define

#### Method

```js
const method = new ValidatedMethod({
    mixins: [PermissionsMixin],
    name,
    allow,            //optional array of permission objects
    deny,             //optional array of permission objects (will be ignored if allow is present
    permissionsError, //optional custom error message
    validate,
    run
});
```

#### Permission object for allow

```js
{
    roles,              //array of strings
    group,              //string
    allow               //function that accepts the methods input and returns a boolean
}
```

#### Permission object for deny

```js
{
    roles,              //array of strings
    group,              //string
    deny                //function that accepts the methods input and returns a boolean
}
```

## Examples

#### Allow

```js
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
```

This will allow:

* A user of role `basic` and group `Roles.GLOBAL_GROUP` when the input is {text: `blah`}
* A user of role `admin` and group `Roles.GLOBAL_GROUP` for all inputs

All other users will be denied

#### Deny

```js
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

```

This will deny:

* A user of role `basic` and group `Roles.GLOBAL_GROUP` when the input is {text: `blah`}
* A user of role `fancy` and group `Roles.GLOBAL_GROUP` for all inputs

All other users will be allowed

## Running methods from the server

If you wish to run a method from the server without permission checks, a method `runTrusted` has been added. It should only be used in the meteor shell for debugging and on startup. **NEVER ADD RUNTRUSTED TO ANOTHER METHOD'S RUN FUNCTION**.

## Running methods from other methods

If you want to run another method within a method, use `function.prototype.call` and apply the context of the first method:

```js
myMethod = new ValidatedMethod({
    //...
    run({num}) {
        return otherMethod.run.call(this, {num: num + 1});
    }
});
```

## Runing Tests

To run tests, make sure the mdg:validated-method package has been updated (`meteor update mdg:validated-method`) and then run:

`meteor test-packages --driver-package practicalmeteor:mocha ./`
