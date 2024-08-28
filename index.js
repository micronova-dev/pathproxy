"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pathProxy = exports.set = exports.get = void 0;
var splitPath = function (p) { return (p === '_') ? [] : p.substring(1).split('_').map(function (k) { var _a, _b; return (_b = (_a = k.match(/^\$?(.*)$/)) === null || _a === void 0 ? void 0 : _a[1]) !== null && _b !== void 0 ? _b : k; }); };
var _getPath = function (x, p) {
    var target = x;
    for (var _i = 0, p_1 = p; _i < p_1.length; _i++) {
        var k = p_1[_i];
        if (target === null || target === undefined) {
            break;
        }
        target = target[k];
    }
    return target;
};
var get = function (x) { return function (p) { return _getPath(x, splitPath(p)); }; };
exports.get = get;
var _set = function (x, p, v) {
    var target = x;
    var key;
    // p is never empty
    for (var _i = 0, p_2 = p; _i < p_2.length; _i++) {
        var k = p_2[_i];
        var u = key ? target[key] : target;
        if (u === undefined || u === null) {
            return false;
        }
        key = k;
        target = u;
    }
    target[key] = v;
    return true;
};
var set = function (x) { return function (p, v) { return _set(x, splitPath(p), v); }; };
exports.set = set;
var pathProxy = function (x, options) {
    if (options === void 0) { options = {}; }
    var onSet = options.onSet, onSetError = options.onSetError, onGet = options.onGet;
    var getT = (0, exports.get)(x);
    var setT = (0, exports.set)(x);
    return new Proxy({}, {
        get: function (_, prop) {
            if (typeof prop === 'symbol') {
                return undefined;
            }
            var p = prop;
            var r = getT(p);
            onGet === null || onGet === void 0 ? void 0 : onGet([p, r]);
            return r;
        },
        set: function (_, prop, value) {
            if (typeof prop === 'symbol') {
                return false;
            }
            var p = prop;
            var result = setT(p, value);
            if (result) {
                onSet === null || onSet === void 0 ? void 0 : onSet([p, value]);
            }
            else {
                onSetError === null || onSetError === void 0 ? void 0 : onSetError([p, value]);
            }
            return result;
        },
        deleteProperty: function () { return false; }
    });
};
exports.pathProxy = pathProxy;
