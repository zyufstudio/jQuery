const gulp=require("gulp");
const cleancss=require("gulp-clean-css");
const concat=require("gulp-concat");
const less=require("gulp-less");
const rename=require("gulp-rename");
const uglify=require("gulp-uglify");

const outPath="./dist";
function js(){
    return gulp.src("./src/jquery.jPage.js")
        .pipe(gulp.dest(outPath))
        .pipe(rename("jquery.jPage.min.js"))
        .pipe(uglify())
        .pipe(gulp.dest(outPath));
}
function css(){
    return gulp.src("./src/jPage.less")
        .pipe(rename("jPage.css"))
        .pipe(less())
        .pipe(gulp.dest(outPath))
        .pipe(rename("jPage.min.css"))
        .pipe(cleancss())
        .pipe(gulp.dest(outPath))
}
gulp.watch(["./src/jquery.jPage.js","./src/jPage.less"],gulp.series(js,css))
exports.default=gulp.series(js,css);