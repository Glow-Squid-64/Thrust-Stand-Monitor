declare var app: any;

window.app = window.app || {};

interface Dictionary<T> {
    [key: string]: T;
}

type Data = {
  value: any;
  key: any;
}