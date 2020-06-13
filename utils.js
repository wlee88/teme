const fs = require('fs');

exports.chooseRandomImage = () => {
    const currentDir = process.cwd();
    const files = fs.readdirSync(`${currentDir}/images`);
    let chosenFile = files[Math.floor(Math.random() * files.length)];
    return chosenFile;
};

exports.hashCode = s => 
    s.trim().split("")
    .reduce((a,b) => { a=((a<<5)-a)+b.charCodeAt(0);return a&a },0); 