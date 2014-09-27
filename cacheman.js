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
            '$timeout',
            '$q',

        function ($window, $timeout, $q) {
            var firstCheck = true,
                rawCache,           // The raw cache object
                angCache,           // Angular element version of cache
                checkTimeout,
                checkingDefer,
                readyCallback = $q.defer(),
                scheduleCheck = function () {
                    $timeout.cancel(checkTimeout);
                    checkTimeout = $timeout(checkCache, 115000 + Math.floor((Math.random() * 5000) + 1));
                },
                noUpdate = function () {
                    firstCheck = false;
                    api.error = false;
                    if (checkingDefer) {
                        checkingDefer.resolve('noupdate');
                        checkingDefer = null;
                    }
                },
                checkCache = function () {
                    try {
                        // Ensure we are up to date on this
                        api.online = $window.navigator.onLine;

                        // Only update if we are online
                        if (api.online) {
                            rawCache.update();
                        }
                    } catch (e) {
                        noUpdate();
                        console.log('Warn: Cacheman loaded, however page has no cache');
                    } finally {
                        // Check for an update ever 2min (with a 5 second variation)
                        scheduleCheck();
                    }
                },
                onError = function () {
                    if (checkingDefer) {
                        checkingDefer.reject('error');
                        checkingDefer = null;
                    }
                    api.downloading = false;
                    api.error = true;
                    scheduleCheck();
                },
                onDownloading = function () {
                    api.downloading = true;
                },
                onCached = function () {
                    api.downloading = false;
                },
                bindCache = function () {
                    api.error = false;
                    api.downloading = false;

                    if (angCache) {
                        angCache.off('updateready', bindCache);
                        angCache.off('noupdate', noUpdate);
                        angCache.off('error', onError);
                        angCache.off('downloading', onDownloading);
                        angCache.off('cached', onCached);

                        // This updates to the new cache
                        // We unbind from the old cache to prevent mem leaks
                        // They are separate objects
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
                        readyCallback.resolve(true);
                        api.updateReady = true;
                    }

                    rawCache = $window.applicationCache;
                    angCache = angular.element(rawCache);

                    angCache.on('updateready', bindCache);
                    angCache.on('noupdate', noUpdate);
                    angCache.on('error', onError);
                    angCache.on('downloading', onDownloading);
                    angCache.on('cached', onCached);
                };
                
                
            // Don't fail on IE9
            if ($window.applicationCache) {
                var api = {
                    checkNow: function () {
                        if (!checkingDefer) {
                            checkingDefer = $q.defer();
                            $timeout.cancel(checkTimeout);
                            checkCache();
                        }

                        return checkingDefer.promise;
                    },

                    // Our callback system
                    readyCallback: readyCallback.promise,
                    updateReady: false
                };
    
                bindCache();
                scheduleCheck();
            } else {
                // Provide a dummy object for browsers that don't support the standard
                var api = {
                    checkNow: angular.noop,
                    readyCallback: $q.defer().promise,
                    updateReady: false
                }
            }
            
            // Keep track of offline and online status
            api.online = $window.navigator.onLine;
            angular.element($window).on('online', function () {
                api.online = true;
            }).on('offline', function () {
                api.online = false;
            });

            return api;
        }]).

        // Ensure this factory is initialized
        run(['cacheman', angular.noop]);

})(this.angular);  // this === window unless in a webworker
