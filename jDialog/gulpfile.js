const gulp=require("gulp");
const cleancss=require("gulp-clean-css");
const copy=require("gulp-copy");
const concat=require("gulp-concat");
const less=require("gulp-less");
const rename=require("gulp-rename");
const uglify=require("gulp-uglify");

const outPath="./dist";
function js(){
    return gulp.src("./src/jquery.jDialog.js")
        //.pipe(copy(outPath))
        .pipe(gulp.dest(outPath))
        .pipe(rename("jquery.jDialog.min.js"))
        .pipe(uglify())
        .pipe(gulp.dest(outPath));
}
function css(){
    return gulp.src("./src/jDialog.less")
        .pipe(rename("jDialog.css"))
        .pipe(less())
        .pipe(gulp.dest(outPath))
        .pipe(rename("jDialog.min.css"))
        .pipe(cleancss())
        .pipe(gulp.dest(outPath))
}
gulp.watch(["./src/jquery.jDialog.js","./src/jDialog.less"],gulp.series(js,css))
exports.default=gulp.series(js,css);