import AppleHealthKit from 'react-native-apple-health';

const permissions = AppleHealthKit.Constants.Permissons;

export const initHealthKit = () => {
     return new Promise((resolve, reject) => {
    const healthKitOptions = {
      permissions: {
        read: [permissions.StepCount],
        write: [],
      },
    };

    AppleHealthKit.initHealthKit(healthKitOptions, (err, results) => {
      if (err) {
        console.log("HealthKit init error:", err);
        reject(err);
      } else {
        console.log("HealthKit initialized");
        resolve(results);
      }
    });
  });
}

export const getStepCount = () => {
    return new Promise((resolve, reject) => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date();

    const options = {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    };

    AppleHealthKit.getStepCount(options, (err, results) => {
      if (err) {
        console.log("Error getting step count:", err);
        reject(err);
      } else {
        resolve(results.value);
      }
    });
  });
};

export const getStepsRange = (startDateISO, endDateISO) => {
  return new Promise((resolve, reject) => {
    const options = {
      startDate: startDateISO,
      endDate: endDateISO,
      interval: 'day',
    };

    AppleHealthKit.getDailyStepCountSamples(options, (err, results) => {
      if (err) {
        console.log("Error getting steps range:", err);
        reject(err);
      } else {
        resolve(results);
      }
    });
  });
};



