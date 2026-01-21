const CACHE_NAME = 'pixel-extractor-v2';

// 静态资源 - 本地文件
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/worker.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// Pyodide CDN 资源 - 需要缓存的外部依赖
const PYODIDE_BASE = 'https://cdn.jsdelivr.net/pyodide/v0.27.7/full/';
const PYODIDE_ASSETS = [
  'pyodide.js',
  'pyodide.asm.js',
  'pyodide.asm.wasm',
  'pyodide_py.tar',
  'python_stdlib.zip',
  'repodata.json',
  // 常用包
  'numpy-1.26.4-cp312-cp312-pyodide_2024_0_wasm32.whl',
  'scipy-1.12.0-cp312-cp312-pyodide_2024_0_wasm32.whl',
  'openblas-0.3.26-0_9_1-cp312-cp312-pyodide_2024_0_wasm32.whl',
  'scikit_image-0.22.0-cp312-cp312-pyodide_2024_0_wasm32.whl',
  'scikit_learn-1.4.0-cp312-cp312-pyodide_2024_0_wasm32.whl',
  'Pillow-10.2.0-cp312-cp312-pyodide_2024_0_wasm32.whl',
  'imageio-2.33.1-py3-none-any.whl',
  'joblib-1.3.2-py3-none-any.whl',
  'threadpoolctl-3.2.0-py3-none-any.whl',
  'lazy_loader-0.3-py3-none-any.whl',
  'networkx-3.2.1-py3-none-any.whl',
  'packaging-23.2-py3-none-any.whl',
  'pywavelets-1.5.0-cp312-cp312-pyodide_2024_0_wasm32.whl',
];

// 安装时缓存静态资源
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => {
      console.log('[SW] Static assets cached');
      self.skipWaiting();
    })
  );
});

// 激活时清理旧缓存
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      console.log('[SW] Activated');
      return self.clients.claim();
    })
  );
});

// 请求拦截 - 缓存优先策略
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // 跳过非 GET 请求
  if (event.request.method !== 'GET') return;
  
  // 判断是否是 Pyodide 资源
  const isPyodideAsset = url.href.startsWith(PYODIDE_BASE) || 
                          url.href.includes('cdn.jsdelivr.net/pyodide') ||
                          url.href.includes('esm.sh');
  
  if (isPyodideAsset) {
    // Pyodide 资源：网络优先，失败后用缓存
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // 克隆响应存入缓存
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // 网络失败，尝试从缓存获取
          return caches.match(event.request);
        })
    );
  } else {
    // 本地资源：缓存优先，没有再走网络
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((response) => {
          // 缓存新资源
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        });
      })
    );
  }
});

// 接收消息 - 用于手动触发 Pyodide 预缓存
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CACHE_PYODIDE') {
    console.log('[SW] Pre-caching Pyodide assets...');
    event.waitUntil(
      caches.open(CACHE_NAME).then(async (cache) => {
        for (const asset of PYODIDE_ASSETS) {
          try {
            const url = PYODIDE_BASE + asset;
            const response = await fetch(url);
            if (response.ok) {
              await cache.put(url, response);
              console.log('[SW] Cached:', asset);
            }
          } catch (e) {
            console.warn('[SW] Failed to cache:', asset, e);
          }
        }
        console.log('[SW] Pyodide pre-cache complete');
      })
    );
  }
});
