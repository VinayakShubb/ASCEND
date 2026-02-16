const PREFIX = 'ascend_';

export const storage = {
  get: <T>(key: string, defaultValue: T): T => {
    try {
      const item = localStorage.getItem(`${PREFIX}${key}`);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error(`Error reading ${key} from storage`, error);
      return defaultValue;
    }
  },

  set: <T>(key: string, value: T): void => {
    try {
      localStorage.setItem(`${PREFIX}${key}`, JSON.stringify(value));
    } catch (error) {
      console.error(`Error writing ${key} to storage`, error);
    }
  },

  remove: (key: string): void => {
    localStorage.removeItem(`${PREFIX}${key}`);
  },
  
  clear: (): void => {
    localStorage.clear();
  }
};
