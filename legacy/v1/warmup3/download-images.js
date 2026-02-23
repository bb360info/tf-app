const fs = require('fs');
const https = require('https');
const path = require('path');

// Read exercises.js to get the data
const content = fs.readFileSync('exercises.js', 'utf8');
const match = content.match(/const EXERCISES = \[\s*([\s\S]*?)\];/);
if (!match) {
    console.error('Could not find EXERCISES array');
    process.exit(1);
}

// Evaluate regex match to get the array
const exercises = eval(`[${match[1]}]`);
console.log(`Found ${exercises.length} exercises.`);

// Helper to download a file
const downloadFile = (url, dest) => {
    return new Promise((resolve, reject) => {
        if (fs.existsSync(dest)) {
            // console.log(`Skipping existing: ${dest}`);
            resolve();
            return;
        }

        const file = fs.createWriteStream(dest);
        const request = https.get(url, response => {
            if (response.statusCode !== 200) {
                fs.unlink(dest, () => { }); // Delete empty file
                reject(new Error(`Status ${response.statusCode} for ${url}`));
                return;
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        });

        request.on('error', err => {
            fs.unlink(dest, () => { });
            reject(err);
        });

        request.setTimeout(10000, () => {
            request.destroy();
            reject(new Error(`Timeout for ${url}`));
        });
    });
};

// Main loop
(async () => {
    let successCount = 0;
    let failCount = 0;

    // Process in chunks to avoid too many open connections
    const CHUNK_SIZE = 10;

    // Create a flat list of all downloads needed
    const tasks = [];
    exercises.forEach(ex => {
        // GIF
        tasks.push({
            type: 'GIF',
            url: `https://cdn.jefit.com/assets/img/exercises/gifs/${ex.id}.gif`,
            dest: path.join('images', 'gif', `${ex.id}.gif`)
        });

        // 3 Static Images
        for (let i = 0; i < 3; i++) {
            tasks.push({
                type: 'IMG',
                url: `https://www.jefit.com/images/exercises/960_590/${ex.id * 4 + i}.jpg`,
                dest: path.join('images', 'static', `${ex.id}_${i}.jpg`)
            });
        }
    });

    console.log(`Total files to download: ${tasks.length}`);

    for (let i = 0; i < tasks.length; i += CHUNK_SIZE) {
        const chunk = tasks.slice(i, i + CHUNK_SIZE);
        const promises = chunk.map(task => downloadFile(task.url, task.dest)
            .then(() => {
                successCount++;
                process.stdout.write('.');
            })
            .catch(err => {
                failCount++;
                // console.error(`Failed ${task.type} for ${task.dest}: ${err.message}`);
                process.stdout.write('x');
            })
        );
        await Promise.all(promises);
    }

    console.log(`\n\nDownload complete.`);
    console.log(`Success: ${successCount}`);
    console.log(`Failed: ${failCount}`);
})();
