var gulp = require('gulp');
var babel = require('gulp-babel');
var uglify = require('gulp-uglify');
var cleanCSS = require('gulp-clean-css');
var htmlmin = require('gulp-htmlmin');
var htmlclean = require('gulp-htmlclean');

/*
 * css
 */
gulp.task('minify-css', function () {
  return gulp.src('./public/**/*.css')
    .pipe(cleanCSS())
    .pipe(gulp.dest('./public'));
});

gulp.task('minify-js', function () {
  return gulp.src(['./public/**/*.js', '!./public/**/*.min.js'])
    .pipe(babel())
    .pipe(uglify())
    .pipe(gulp.dest('./public'));
});

gulp.task('minify-html', function () {
  return gulp.src('./public/**/*.html')
    .pipe(htmlclean())
    .pipe(htmlmin({
      removeComments: true,
      minifyJS: true,
      minifyCSS: true,
      minifyURLs: true,
    }))
    .pipe(gulp.dest('./public'));
});

gulp.task('default', gulp.parallel('minify-html', 'minify-css', 'minify-js'));

//4.0以前的写法 
//gulp.task('default', [
//  'minify-html', 'minify-css', 'minify-js', 'minify-images'
//]);
//4.0以后的写法
// 执行 gulp 命令时执行的任务
// gulp.task('default', gulp.series(gulp.parallel('minify-html', 'minify-css', 'minify-js', 'minify-images')), function () {
//   console.log("----------gulp Finished----------");
//   // Do something after a, b, and c are finished.
// });