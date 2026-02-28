/* eslint-disable no-console */

import fs from 'fs';
import path from 'path';

// _SERVE='' npm run build 的时候就可以生效此插件，然后使用 serve dist 启动一个静态服务器
// _SERVE='dist2' 时，可以生成到不同于 dist 的目录下
export default (api: import('umi').IApi) => {
  api.describe({
    key: 'dist-serve',
    enableBy() {
      if ('_SERVE' in process.env) {
        console.warn(
          '_SERVE env is for internal usage only, susceptible to change, do not rely on it. 🚨🚨🚨',
        );
        console.info('serve plugin load');
        return true;
      }
      return false;
    },
  });

  function createServeAssets(
    distDir: string,
    serveDir: string,
    publicPath: string = '/',
  ) {
    const sourceDir = distDir;
    const destDir = path.join(serveDir, publicPath);
    const files = fs.readdirSync(sourceDir);
    fs.mkdirSync(destDir, { recursive: true });
    for (const file of files) {
      const sourceFilePath = path.join(sourceDir, file);
      const destFilePath = path.join(destDir, file);
      if (file === 'serve.json') {
        continue;
      } else {
        if (sourceFilePath === destFilePath) {
          void 0;
        } else {
          if (fs.statSync(sourceFilePath).isDirectory()) {
            fs.mkdirSync(destFilePath, { recursive: true });
            createServeAssets(sourceFilePath, destFilePath);
          } else {
            fs.copyFileSync(sourceFilePath, destFilePath);
          }
        }
      }
    }
  }
  const relativeOutputPath = path.relative(api.cwd, api.paths.absOutputPath);
  const absServePath = path.join(
    api.cwd,
    process.env._SERVE || relativeOutputPath,
  );

  const umiVersionMajor = process.env.UMI_VERSION?.split('.')[0] || '';
  const buildHtmlCompleteHookName = ['3', '2'].includes(umiVersionMajor)
    ? 'onBuildComplete'
    : 'onBuildHtmlComplete';

  api[buildHtmlCompleteHookName as 'onBuildComplete'](() => {
    const serveJsonObj = {
      cleanUrls: false,
      rewrites: [
        {
          source: path.join(api.config.base, '**'),
          destination: path.join(api.config.publicPath, 'index.html'),
        },
      ],
      redirects:
        api.config.base !== '/'
          ? [{ source: '/', destination: api.config.base }]
          : undefined,
      headers: [
        {
          source: '**/*.html',
          headers: [
            {
              key: 'Cache-Control',
              value: 'no-store',
            },
            {
              key: 'Access-Control-Allow-Headers',
              value: '*',
            },
            {
              key: 'Access-Control-Allow-Origin',
              value: '*',
            },
          ],
        },
      ],
    };
    if (absServePath === api.cwd) {
      // 如果不小心做了这种配置，一定要退出，不然把项目删掉了就傻叉了
      throw new Error('Internal Error: absServePath is same as cwd');
    }
    console.info('serve assets will be created in:', absServePath);
    if (absServePath !== api.paths.absOutputPath) {
      if (fs.existsSync(absServePath)) {
        fs.rmSync(absServePath, { recursive: true });
      }
      fs.mkdirSync(absServePath, { recursive: true });
    }
    fs.writeFileSync(
      path.join(absServePath, 'serve.json'),
      JSON.stringify(serveJsonObj),
      {
        encoding: 'utf-8',
      },
    );
    try {
      createServeAssets(
        api.paths.absOutputPath,
        absServePath,
        api.config.publicPath,
      );
      console.info('serve assets created');
    } catch (err) {
      console.error('serve assets create failed', err);
    }
  });
};
