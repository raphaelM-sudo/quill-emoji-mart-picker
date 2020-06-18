import * as del from 'del';
import { copySync } from 'fs-extra';
import { ngPackagr } from 'ng-packagr';
import { join } from 'path';

async function main() {
  // cleanup dist

  try {
    del.sync(join(process.cwd(), '/dist'));
    del.sync(join(process.cwd(), '/node_modules/@nutrify/quill-emoji-mart-picker'));
  } catch (e) {
    // tslint:disable-next-line: no-console
    console.info('Ignoring: Could not delete previous build.');
  }

  await ngPackagr()
    .forProject(join(process.cwd(), 'src/lib/package.json'))
    .build();

  // put it in node modules so the path resolves
  // proper path support eventually
  copySync(
    join(process.cwd(), '/dist/quill-emoji-mart-picker'),
    join(process.cwd(), '/node_modules/@nutrify/quill-emoji-mart-picker'),
  );

  copySync(
    join(process.cwd(), 'README.md'),
    join(process.cwd(), '/dist/quill-emoji-mart-picker/README.md'),
  );
  copySync(
    join(process.cwd(), 'LICENSE'),
    join(process.cwd(), '/dist/quill-emoji-mart-picker/LICENSE'),
  );
  copySync(
    join(process.cwd(), 'src/lib/css/emoji.quill.css'),
    join(process.cwd(), '/dist/quill-emoji-mart-picker/emoji.quill.css'),
  );
}

main()
  .then(() => console.log('success'))
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
