# 限制并发数量的任务调度器

## 功能

1. 一个带并发限制的异步调度器`asyncScheduler`，保证同时运行的任务最多n个（Scheduler会让资源利用率实现最大化，一旦并发池有任务完成会尽快调用下一个任务执行）

## 代码演示

```shell
npm install mini-async-scheduler
```

### 基础用法

```typescript
import asyncScheduler from "mini-async-scheduler";

const generatorTask =
  <T>(ms: number, taskId: T): (() => Promise<T>) =>
  () =>
    new Promise((resolve) => setTimeout(() => resolve(taskId), ms));
const task1 = generatorTask(1000, 1);
const task2 = generatorTask(500, 2);
const task3 = generatorTask(300, 3);
const task4 = generatorTask(400, 4);
const tasks = [task1, task2, task3, task4];

(async () => {
  console.time("time");

  const res = await asyncScheduler(tasks, 2);
  console.log(res); // [1, 2, 3, 4]

  console.timeEnd("time"); // 1200
})();

/**
  整个的完整执行流程：
  ⏰0ms 开始执行任务1和任务2
  并发数已到达2，等待任务执行完成...
  ⏰500时，任务2完成✅，开始执行任务3
  并发数已到达2，等待任务执行完成...
  ⏰800时，任务3完成✅，开始执行任务4
  并发数已到达2，等待任务执行完成...
  ⏰1000时，任务1完成✅，任务已经全部执行了，只剩下任务4还在执行
  ⏰1200时，任务4完成✅，执行器resolve，结果以任务的顺序返回 [1, 2, 3, 4];
  输出顺序是：2 3 1 4
  执行时间：1200
 */
```

## API

```typescript
function asyncScheduler(tasks: Array<any>, concurrencyLimit: number): Promise<any[]>
```

### tasks

任务列表数组，不一定是`Array<Promise>`

### concurrencyLimit

并发数量，默认值为`1`，`大于等于1`

### result

 1. 当所有promise resolve了，整个调度器就resolve了,resolve会返回一个按tasks顺序排列的结果数组
 2. 只要有一个 promise reject了，那么整个调度器就reject了，不再往下调度了

## License
