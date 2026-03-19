/**
 * 性能测试工具
 * 用于测试和验证性能优化效果
 */

import { getPerformanceMonitor } from './monitor';

interface PerformanceTest {
  name: string;
  fn: () => Promise<void> | void;
  iterations?: number;
}

interface TestResult {
  name: string;
  avgTime: number;
  minTime: number;
  maxTime: number;
  iterations: number;
  passed: boolean;
  threshold?: number;
}

/**
 * 性能测试运行器
 */
export class PerformanceTestRunner {
  private results: TestResult[] = [];

  /**
   * 运行单个测试
   */
  async runTest(test: PerformanceTest, threshold?: number): Promise<TestResult> {
    const { name, fn, iterations = 10 } = test;
    const times: number[] = [];

    console.log(`Running test: ${name}`);

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await fn();
      const end = performance.now();
      times.push(end - start);
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const passed = threshold ? avgTime <= threshold : true;

    const result: TestResult = {
      name,
      avgTime,
      minTime,
      maxTime,
      iterations,
      passed,
      threshold,
    };

    this.results.push(result);
    return result;
  }

  /**
   * 运行多个测试
   */
  async runTests(tests: PerformanceTest[], thresholds?: Record<string, number>): Promise<TestResult[]> {
    this.results = [];

    for (const test of tests) {
      await this.runTest(test, thresholds?.[test.name]);
    }

    return this.results;
  }

  /**
   * 获取测试结果
   */
  getResults(): TestResult[] {
    return this.results;
  }

  /**
   * 打印测试报告
   */
  printReport(): void {
    console.log('\n=== Performance Test Report ===\n');

    this.results.forEach((result) => {
      const status = result.passed ? '✓' : '✗';
      console.log(`${status} ${result.name}`);
      console.log(`  Average: ${result.avgTime.toFixed(2)}ms`);
      console.log(`  Min: ${result.minTime.toFixed(2)}ms`);
      console.log(`  Max: ${result.maxTime.toFixed(2)}ms`);
      if (result.threshold) {
        console.log(`  Threshold: ${result.threshold}ms`);
      }
      console.log('');
    });

    const passed = this.results.filter((r) => r.passed).length;
    const total = this.results.length;
    console.log(`Total: ${passed}/${total} tests passed\n`);
  }
}

/**
 * 常见性能测试场景
 */
export const performanceTests = {
  /**
   * 测试组件渲染性能
   */
  componentRender: (Component: React.ComponentType, props?: any): PerformanceTest => ({
    name: 'Component Render',
    fn: async () => {
      const { render } = await import('@testing-library/react');
      render(<Component {...props} />);
    },
    iterations: 100,
  }),

  /**
   * 测试 IndexedDB 读取性能
   */
  idbRead: (db: any, storeName: string, key: string): PerformanceTest => ({
    name: 'IndexedDB Read',
    fn: async () => {
      await db.get(storeName, key);
    },
    iterations: 50,
  }),

  /**
   * 测试 IndexedDB 写入性能
   */
  idbWrite: (db: any, storeName: string, key: string, value: any): PerformanceTest => ({
    name: 'IndexedDB Write',
    fn: async () => {
      await db.set(storeName, key, value);
    },
    iterations: 50,
  }),

  /**
   * 测试 API 请求性能
   */
  apiRequest: (url: string, options?: RequestInit): PerformanceTest => ({
    name: 'API Request',
    fn: async () => {
      await fetch(url, options);
    },
    iterations: 10,
  }),

  /**
   * 测试大列表渲染性能
   */
  largeListRender: (itemCount: number): PerformanceTest => ({
    name: `Large List Render (${itemCount} items)`,
    fn: () => {
      const container = document.createElement('div');
      for (let i = 0; i < itemCount; i++) {
        const item = document.createElement('div');
        item.textContent = `Item ${i}`;
        container.appendChild(item);
      }
    },
    iterations: 10,
  }),

  /**
   * 测试搜索性能
   */
  search: (data: any[], query: string, searchFn: (item: any, query: string) => boolean): PerformanceTest => ({
    name: 'Search Performance',
    fn: () => {
      data.filter((item) => searchFn(item, query));
    },
    iterations: 100,
  }),
};

/**
 * 性能基准测试
 */
export async function runPerformanceBenchmark(): Promise<void> {
  const monitor = getPerformanceMonitor();
  const runner = new PerformanceTestRunner();

  // 定义性能阈值（毫秒）
  const thresholds = {
    'Component Render': 50,
    'IndexedDB Read': 10,
    'IndexedDB Write': 20,
    'API Request': 1000,
    'Large List Render (1000 items)': 100,
    'Search Performance': 50,
  };

  // 运行测试
  const tests: PerformanceTest[] = [
    performanceTests.largeListRender(1000),
    // 可以添加更多测试
  ];

  await runner.runTests(tests, thresholds);
  runner.printReport();

  // 获取 Web Vitals
  const metrics = monitor.getMetrics();
  console.log('\n=== Web Vitals ===\n');
  console.log('LCP:', metrics.LCP?.value.toFixed(2), 'ms', `(${metrics.LCP?.rating})`);
  console.log('FID:', metrics.FID?.value.toFixed(2), 'ms', `(${metrics.FID?.rating})`);
  console.log('CLS:', metrics.CLS?.value.toFixed(4), `(${metrics.CLS?.rating})`);
  console.log('FCP:', metrics.FCP?.value.toFixed(2), 'ms', `(${metrics.FCP?.rating})`);
  console.log('TTFB:', metrics.TTFB?.value.toFixed(2), 'ms', `(${metrics.TTFB?.rating})`);
}

/**
 * 内存使用监控
 */
export function monitorMemoryUsage(): void {
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    console.log('\n=== Memory Usage ===\n');
    console.log('Used JS Heap:', (memory.usedJSHeapSize / 1048576).toFixed(2), 'MB');
    console.log('Total JS Heap:', (memory.totalJSHeapSize / 1048576).toFixed(2), 'MB');
    console.log('Heap Limit:', (memory.jsHeapSizeLimit / 1048576).toFixed(2), 'MB');
  }
}

/**
 * 长任务监控
 */
export function monitorLongTasks(): void {
  if ('PerformanceObserver' in window) {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          console.warn('Long Task detected:', {
            duration: entry.duration,
            startTime: entry.startTime,
          });
        });
      });
      observer.observe({ entryTypes: ['longtask'] });
    } catch (e) {
      console.warn('Long task monitoring not supported');
    }
  }
}
