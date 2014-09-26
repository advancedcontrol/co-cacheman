(function(angular) {
    'use strict';

    // Use existing module otherwise create a new one
    var module;
    try {
        module = angular.module('coUtils');
    } catch (e) {
        module = angular.module('coUtils', []);
    }
    
    module.
        factory('cacheman', [
            '$window',
            '$document',
            '$timeout',
            '$q',

        function ($window, $document, $timeout, $q) {
            var firstCheck = true,
                rawCache,           // The raw cache object
                angCache,           // Angular element version of cache
                checkTimeout,
                checkingDefer,
                updateReady = $q.defer(),
                noUpdate = function () {
                    firstCheck = false;
                    if (checkingDefer) {
                        checkingDefer.resolve('noupdate');
                        checkingDefer = null;
                    }
                },
                checkCache = function () {
                    try {
                        // Only update if we are online
                        if (api.online) {
                            rawCache.update();
                        }

                        // Check for an update ever 2min (with a 5 second variation)
                        checkTimeout = $timeout(checkCache, 115000 + Math.floor((Math.random() * 5000) + 1));
                    } catch (e) {
                        noUpdate();
                        console.log('Warn: Cacheman loaded, however page has no cache');
                    }
                },
                bindCache = function () {

                    if (angCache) {
                        angCache.off('updateready', bindCache);
                        angCache.off('noupdate', noUpdate);

                        // This updates to the new cache
                        rawCache.swapCache();

                        // if this was our first check then we want to
                        // reload as the cache might be really out of date
                        if (firstCheck) {
                            $window.location.reload();
                        }

                        // If we were defering this - i.e we want to know
                        // when checking has completed, as update ready doesn't
                        // indicate this
                        if (checkingDefer) {
                            checkingDefer.resolve('updateready');
                            checkingDefer = null;
                        }

                        // All other listeners
                        updateReady.resolve(true);
                    }

                    rawCache = $window.applicationCache;
                    angCache = angular.element(rawCache);

                    angCache.on('updateready', bindCache);
                    angCache.on('noupdate', noUpdate);
                },
                api = {
                    checkNow: function () {
                        if (!checkingDefer) {
                            checkingDefer = $q.defer();
                            $timeout.cancel(checkTimeout);
                            checkCache();
                        }

                        return checkingDefer.promise;
                    },

                    // Our callback system
                    updateReady: updateReady.promise,
                };

            bindCache();
            checkCache();

            // Keep track of offline and online status
            api.online = $window.navigator.onLine;
            $document.on('online', function () {
                api.online = true;
            });
            $document.on('offline', function () {
                api.online = false;
            });

            return api;
        }]).

        // Ensure this factory is initialized
        run(['cacheman', angular.noop]);

})(this.angular);  // this === window unless in a webworker
