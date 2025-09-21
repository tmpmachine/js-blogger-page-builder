import express from 'express';
import serveIndex from 'serve-index';

let servers = [{ port: 4200, dir: 'src/' }];

// Start servers
console.log('Servers running at:');
for (let server of servers) {
	let { port, dir } = server;
	let app = express();

	app.use(express.static(dir)	);
	app.use('/', serveIndex(dir, { icons: true })); // Use dir dynamically

	app.listen(port, () => {
		console.log(`${dir}: http://localhost:${port}/pages/`);
	});
}
