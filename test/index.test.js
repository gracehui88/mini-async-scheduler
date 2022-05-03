const asyncScheduler = require('../lib/index').default;

const sleep = (ms) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
};

describe('asyncScheduler', () => {
  test('实现并发调用：任务数量 > 并发数量', async () => {
    const statedTaskOrder = [];
    const successFinishedTaskOrder = [];
    const generatorTask = (ms, taskId) => () => {
      statedTaskOrder.push(taskId);
      return new Promise((resolve) =>
        setTimeout(() => {
          successFinishedTaskOrder.push(taskId);
          resolve(taskId);
        }, ms),
      );
    };

    const tasks = [
      [1000, 1],
      [500, 2],
      [300, 3],
      [400, 4],
    ].map(([ms, taskId]) => generatorTask(ms, taskId));

    const startedTs = Date.now();
    await asyncScheduler(tasks, 2);

    expect(statedTaskOrder).toEqual([1, 2, 3, 4]);
    expect(successFinishedTaskOrder).toEqual([2, 3, 1, 4]);

    expect(Date.now() - startedTs).toBeGreaterThanOrEqual(1200);
    expect(Date.now() - startedTs).toBeLessThanOrEqual(1200 + 99); // +99是避免事件循环消耗了一定时间而导致单测失败
  });

  test('实现并发调用：任务数量 <= 并发数量', async () => {
    const statedTaskOrder = [];
    const successFinishedTaskOrder = [];
    const generatorTask = (ms, taskId) => () => {
      statedTaskOrder.push(taskId);
      return new Promise((resolve) =>
        setTimeout(() => {
          successFinishedTaskOrder.push(taskId);
          resolve(taskId);
        }, ms),
      );
    };

    const tasks = [
      [1000, 1],
      [500, 2],
      [300, 3],
      [400, 4],
    ].map(([ms, taskId]) => generatorTask(ms, taskId));

    const startedTs = Date.now();
    await asyncScheduler(tasks, 4);

    expect(statedTaskOrder).toEqual([1, 2, 3, 4]);
    expect(successFinishedTaskOrder).toEqual([3, 4, 2, 1]);
    expect(Date.now() - startedTs).toBeGreaterThanOrEqual(1000);
    expect(Date.now() - startedTs).toBeLessThanOrEqual(1000 + 99); // +99是避免事件循环消耗了一定时间而导致单测失败
  });

  test('结果按任务顺序返回：任务数量 > 并发数量', async () => {
    const generatorTask = (ms, taskId) => () => {
      return new Promise((resolve) =>
        setTimeout(() => {
          resolve(taskId);
        }, ms),
      );
    };

    const tasks = [
      [1000, 1],
      [500, 2],
      [300, 3],
      [400, 4],
    ].map(([ms, taskId]) => generatorTask(ms, taskId));

    const res = await asyncScheduler(tasks, 2);

    expect(res).toEqual([1, 2, 3, 4]);
  });

  test('结果按任务顺序返回：任务数量 <= 并发数量', async () => {
    const generatorTask = (ms, taskId) => () => {
      return new Promise((resolve) =>
        setTimeout(() => {
          resolve(taskId);
        }, ms),
      );
    };

    const tasks = [
      [1000, 1],
      [500, 2],
      [300, 3],
      [400, 4],
    ].map(([ms, taskId]) => generatorTask(ms, taskId));

    const res = await asyncScheduler(tasks, 4);

    expect(res).toEqual([1, 2, 3, 4]);
  });

  test('任务返回结果可以是任意数据结果，不限定为Promise', async () => {
    const generatorTask = (taskId) => () => taskId;
    const tasks = [1, 2, 3, 4].map((taskId) => generatorTask(taskId));

    const res = await asyncScheduler(tasks, 4);

    expect(res).toEqual([1, 2, 3, 4]);
  });

  it('当任务中有reject，整个调度器reject，并且控制台中不会存在 Uncaught (in promise) Error/UnhandledPromiseRejectionWarning', async () => {
    const generatorTask = (ms, taskId) => () =>
      new Promise((resolve, reject) =>
        setTimeout(() => {
          reject(new Error(String(taskId)));
        }, ms),
      );

    const tasks = [
      [1000, 1],
      [500, 2],
      [300, 3],
      [400, 4],
    ].map(([ms, taskId]) => generatorTask(ms, taskId));

    return expect(asyncScheduler(tasks, 2)).rejects.toThrow(String(2));
    // 检查控制台是否有未捕获的reject promise错误（Uncaught (in promise) Error/UnhandledPromiseRejectionWarning）
  });

  it('当任务中有reject，整个调度器reject，并且控制台中不会存在 Uncaught (in promise) Error/UnhandledPromiseRejectionWarning', async () => {
    const generatorTask = (ms, taskId) => () =>
      new Promise((resolve, reject) =>
        setTimeout(() => {
          reject(new Error(String(taskId)));
        }, ms),
      );

    const tasks = [
      [1000, 1],
      [500, 2],
      [300, 3],
      [400, 4],
    ].map(([ms, taskId]) => generatorTask(ms, taskId));

    return expect(asyncScheduler(tasks, 5)).rejects.toThrow(String(3));
    // 检查控制台是否有未捕获的reject promise错误（Uncaught (in promise) Error/UnhandledPromiseRejectionWarning）
  });

  it('当任务中有reject，整个调度器立马reject，不会再继续执行其他任务', async () => {
    const statedTaskOrder = [];
    const finishedTaskOrder = [];
    const successFinishedTaskOrder = [];

    const generatorTask = (ms, taskId) => () => {
      statedTaskOrder.push(taskId);

      return new Promise((resolve, reject) =>
        setTimeout(() => {
          finishedTaskOrder.push(taskId);
          if (taskId === 3) {
            reject(new Error(String(taskId)));
          } else {
            successFinishedTaskOrder.push(taskId);
            resolve(taskId);
          }
        }, ms),
      );
    };

    const tasks = [
      [1000, 1],
      [500, 2],
      [300, 3],
      [400, 4],
    ].map(([ms, taskId]) => generatorTask(ms, taskId));

    const res = await expect(asyncScheduler(tasks, 2)).rejects.toThrow(String(3));

    expect(statedTaskOrder).toEqual([1, 2, 3]);
    expect(finishedTaskOrder).toEqual([2, 3]);
    expect(successFinishedTaskOrder).toEqual([2]);

    await sleep(2000);

    expect(statedTaskOrder).toEqual([1, 2, 3]);
    expect(finishedTaskOrder).toEqual([2, 3, 1]);
    expect(successFinishedTaskOrder).toEqual([2, 1]);

    // make sure to add a return statement https://jestjs.io/zh-Hans/docs/expect#tobevalue
    return res;
  });
});
