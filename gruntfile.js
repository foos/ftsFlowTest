module.exports = function(grunt){

    // configure  
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        eslint: {
            options :{
                configFile : '.eslintrc.json'
            },
            target: ['*.js']
        }
    });
    
    // load plugin
    grunt.loadNpmTasks('grunt-eslint'); 
    // nb there is a separate npm that will auto load all these for you caled load-grunt-tasks, so no need to write one per line.
    
    // register default
    grunt.registerTask('default', ['eslint']);
 
};