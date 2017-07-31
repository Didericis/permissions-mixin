# didericis:permissions-mixin [![Circle CI](https://circleci.com/gh/Didericis/permissions-mixin.svg?style=svg)](https://circleci.com/gh/Didericis/permissions-mixin)

This is a mixin for meteor's [mdg:validated-method](https://github.com/meteor/validated-method). It uses the [alanning:roles](https://github.com/alanning/meteor-roles) package and allows you to define what users with what roles are allowed or denied use of your method, and under what conditions. 

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
    allow,            //optional array of permission objects (Cannot use with deny)
    deny,             //optional array of permission objects (Cannot use with allow)
    permissionsError, //optional custom error message
    validate,
    run
});
```

#### Permission object for allow

```js
{
    roles,              //either true, a string, or an array of strings
    group,              //either true, a string, or an array of strings
    allow               //function that accepts the methods input and returns a boolean
}
```

#### Permission object for deny

```js
{
    roles,              //either true, a string, or an array of strings
    group,              //either true, a string, or an array of strings
    deny                //function that accepts the methods input and returns a boolean
}
```

If roles is set to `true`, the permissions object will target all users within the group/groups given (or all groups is groups is set to `true`. This is the same as what the `PermissionsMixin.LoggedIn` method does. Scroll down to see an example).

If roles is set to a string, the permissions object will target all users with that particular role in the group/groups given (or all groups is groups is set to `true`);

If roles is set to an array of string, the permissions object will target all users with those particular roles in the group/groups given (or all groups is groups is set to `true`);

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

All other users will be denied.

To allow all users, set allow to `true` instead of an array of permissions objects.

To allow only logged in users, you can use the following syntax:

```js
const allowIfLoggedIn = new ValidatedMethod({
    name: 'AllowIfLoggedIn',
    mixins: [PermissionsMixin],
    allow: PermissionsMixin.LoggedIn
    validate: new SimpleSchema({
        text: { type: String }
    }).validator(),
    run({text}) {
        return testCollection.insert({text: text});
    }
});
```

#### Deny

##### **IMPORTANT NOTE**: In general, it is better to use `allow` than `deny`.

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

## Adding a SecuredMethod

If you'd like to make sure no methods can be called unless their permissions have been explicitly set, it's probably a good idea to create a method that automatically adds `PermissionsMixin`:

```js
SecuredMethod = class SecuredMethod extends ValidatedMethod {
    constructor(methodDefinition) {
        if (Array.isArray(methodDefinition.mixins)) {
            methodDefinition.mixins = methodDefinition.mixins.concat(PermissionsMixin);
        } else {
            methodDefinition.mixins = [PermissionsMixin];
        }
        super(methodDefinition);
    }
}
```

This allows you to more easily tell what has been secured and what hasn't and encourages you to always explicitly define permissions.


## Running Tests

To run tests, make sure the mdg:validated-method package has been updated (`meteor update mdg:validated-method`) and then run:

`meteor test-packages --driver-package practicalmeteor:mocha ./`
