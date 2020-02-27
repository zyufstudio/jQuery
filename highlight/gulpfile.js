const gulp=require("gulp");
const cleancss=require("gulp-clean-css");
const concat=require("gulp-concat");
const less=require("gulp-less");
const rename=require("gulp-rename");
const uglify=require("gulp-uglify");

const outPath="./dist";
const srcArray=["./src/highlight_src.js","./src/browser.js","./src/copyButton.js","./src/lineNumbers.js"];
function js(){
    return gulp.src(srcArray)
        .pipe(concat('highlight.js'))
        .pipe(gulp.dest(outPath))
        .pipe(rename("highlight.min.js"))
        .pipe(uglify())
        .pipe(gulp.dest(outPath));
}
function css(){
    return gulp.src("./src/highlight.less")
        .pipe(rename("highlight.css"))
        .pipe(less())
        .pipe(gulp.dest(outPath))
        .pipe(rename("highlight.min.css"))
        .pipe(cleancss())
        .pipe(gulp.dest(outPath))
}
gulp.watch(srcArray,gulp.series(js))
exports.default=gulp.series(js);