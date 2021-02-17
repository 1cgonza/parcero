const { parallel, src, dest, watch } = require('gulp');
const scss = require('gulp-sass');
const electron = require('electron-connect').server.create();

// gulp.task('reload:browser', function() {
//   electron.restart();
// });

// gulp.task('reload:renderer', function() {
//   electron.reload();
// });

// gulp.task('default', ['scss', 'serve']);

function styles() {
  return src('./browser/scss/**/*.scss')
    .pipe(scss().on('error', scss.logError))
    .pipe(dest('./browser/css'));
}

function server(cb) {
  electron.start();

  watch('app.js', function(cb) {
    electron.restart();
    cb();
  });

  watch([
    './main/**/*.js',
    'browser/**/*.html', 'browser/**/*.js',
    './utils/**/*.js'
  ], electron.reload);

  // watch('./browser/scss/**/*.scss', ['styles', electron.reload]);
  cb()
  }

exports.default = parallel(styles, server);
