const gulp=require("gulp");
const jshint = require('gulp-jshint');
const cleancss=require("gulp-clean-css");
const concat=require("gulp-concat");
const less=require("gulp-less");
const rename=require("gulp-rename");
const uglify=require("gulp-uglify");

const outPath="./dist";
function js(){
    return gulp.src("./src/jquery.jBoxSelect.js")
        .pipe(jshint())
        .pipe(jshint.reporter('default'))
        .pipe(gulp.dest(outPath))
        .pipe(rename("jquery.jBoxSelect.min.js"))
        .pipe(uglify())
        .pipe(gulp.dest(outPath));
}
function css(){
    return gulp.src("./src/jBoxSelect.less")
        .pipe(rename("jBoxSelect.css"))
        .pipe(less())
        .pipe(gulp.dest(outPath))
        .pipe(rename("jBoxSelect.min.css"))
        .pipe(cleancss())
        .pipe(gulp.dest(outPath))
}
gulp.watch(["./src/jquery.jBoxSelect.js","./src/jBoxSelect.less"],gulp.series(js,css))
exports.default=gulp.series(js,css);