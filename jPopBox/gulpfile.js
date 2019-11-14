const gulp=require("gulp");
const cleancss=require("gulp-clean-css");
const concat=require("gulp-concat");
const less=require("gulp-less");
const rename=require("gulp-rename");
const uglify=require("gulp-uglify");

const outPath="./dist";
function js(){
    return gulp.src("./src/jPopBox.js")
        //.pipe(copy(outPath))
        .pipe(gulp.dest(outPath))
        .pipe(rename("jPopBox.min.js"))
        .pipe(uglify())
        .pipe(gulp.dest(outPath));
}
function css(){
    return gulp.src("./src/jPopBox.less")
        .pipe(rename("jPopBox.css"))
        .pipe(less())
        .pipe(gulp.dest(outPath))
        .pipe(rename("jPopBox.min.css"))
        .pipe(cleancss())
        .pipe(gulp.dest(outPath))
}
gulp.watch(["./src/jPopBox.js","./src/jPopBox.less"],gulp.series(js,css))
exports.default=gulp.series(js,css);