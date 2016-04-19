/* global PermissionsMixin:true, Roles */
PermissionsMixin = function(methodOptions) {
    const DEFINITION_ERROR = 'PermssionsMixin.Definition';

    const checkMethodOption = function checkMethodOption(methodOptions,
        methodOptionName) {
        if (methodOptions[methodOptionName]) {
            check(methodOptions[methodOptionName],
                Match.OneOf([Object], Boolean));

            if (Array.isArray(methodOptions[methodOptionName])) {
                if (methodOptions[methodOptionName].length === 0) {
                    throw new Meteor.Error(DEFINITION_ERROR,
                    `{methodOptionName} must have at least one document in it`);
                }

                methodOptions[methodOptionName].forEach(permitDoc => {
                    try {
                        check(permitDoc, {
                            roles: [String],
                            group: String,
                            [methodOptionName]: Match.Optional(Function)
                        });
                    } catch(e) {
                        throw new Meteor.Error(DEFINITION_ERROR, e.message);
                    }
                });
            }
        }
    };

    const isRole = function isRole(option, roleDoc, userId, args) {
        if (Roles.userIsInRole(userId, roleDoc.roles, roleDoc.group)) {
            if (roleDoc[option]) {
                return roleDoc[option].apply({userId: userId}, args);
            } else if (!roleDoc.hasOwnProperty(option)) {
                return true;
            }
        }
        return false;
    };

    const isDenied = function isDenied({deny}, userId, args) {
        if (!deny) return true;

        for (var i = 0; i < methodOptions.deny.length; i++) {
            if (isRole('deny', methodOptions.deny[i], userId, args) === true) {
                throw new Meteor.Error(methodOptions.permissionsError.name,
                    methodOptions.permissionsError.message(userId));
            }
        }
        return false;
    }

    const isAllowed = function isAllowed({allow}, userId, args) {
        if (!allow) return false;

        if (allow === true) {
            return true;
        } else if (Array.isArray(allow)) {
            for (var i = 0; i < allow.length; i++) {
                if (isRole('allow', allow[i], userId, args) === true) {
                    return true;
                }
            }
            throw new Meteor.Error(methodOptions.permissionsError.name,
                methodOptions.permissionsError.message(userId));
        }
        throw new Meteor.Error(methodOptions.permissionsError.name,
            methodOptions.permissionsError.message(userId));
    };

    const runFunc = methodOptions.run;

    methodOptions.run = function run() {
        const userId = this.userId;

        if (this.isTrusted === true) {
            return runFunc.apply(this, arguments);
        } else if (isAllowed(methodOptions, userId, arguments) === true) {
            return runFunc.apply(this, arguments);
        } else if (isDenied(methodOptions, userId, arguments) === false) {
            return runFunc.apply(this, arguments);
        }

        throw new Meteor.Error(methodOptions.permissionsError.name,
            methodOptions.permissionsError.message(userId));
    };

    methodOptions.runTrusted = function runTrusted() {
        return runFunc.apply({isTrusted: true}, arguments);
    };

    methodOptions.permissionsError = methodOptions.permissionsError || {
        name: 'PermissionsMixin.NotAllowed',
        message(userId) {
            return `User ${userId} is not allowed to use ${methodOptions.name}`;
        }
    };

    checkMethodOption(methodOptions, 'allow');
    checkMethodOption(methodOptions, 'deny');

    return methodOptions;
}
