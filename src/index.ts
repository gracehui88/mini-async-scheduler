export default async function asyncScheduler<R = any>(
  tasks: Array<() => R> = [],
  concurrencyLimit = 1,
): Promise<R[]> {
  const taskCount = tasks.length;
  let runIndex = 0;
  const taskRes: R[] = [];
  let completeTaskCount = 0;
  let promiseStatus = 'pending';

  const promise = new Promise<R[]>((resolve, reject) => {
    const execTask = async () => {
      const index = runIndex;
      const task = tasks[runIndex];
      runIndex++;
      if (!task || promiseStatus !== 'pending') return;

      Promise.resolve(task())
        .then((res) => {
          taskRes[index] = res;
          completeTaskCount++;
          if (completeTaskCount === taskCount) {
            promiseStatus = 'fulfilled';
            resolve(taskRes);
          }
          execTask();
        })
        .catch((err) => {
          promiseStatus = 'rejected';
          reject(err);
        });
    };

    const start = () => {
      for (let index = 0; index < concurrencyLimit; index++) {
        execTask();
      }
    };

    start();
  });

  return promise;
}
