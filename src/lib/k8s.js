import * as config from "./config";
import * as Client from "node-kubernetes-client";
import * as util from "util";
import * as fs from "fs";


const readToken = fs.readFileSync('/var/run/secrets/kubernetes.io/serviceaccount/token');


var client = new Client({
  host: config.k8sROServiceAddress,
  namespace: config.namespace,
  protocol: 'https',
  version: 'v1',
  token: readToken
});


const getMongoPods = done => {
  client.pods.get((err, podResult) => {
    if (err)
      return done(err);

    let pods = [];
    for (let j in podResult)
      pods = pods.concat(podResult[j].items)

    let labels = config.mongoPodLabelCollection;
    let results = [];
    for (let i in pods) {
      let pod = pods[i];
      if (podContainsLabels(pod, labels))
        results.push(pod);
    }

    done(null, results);
  });
};


const podContainsLabels = (pod, labels) => {
  if (!pod.metadata || !pod.metadata.labels)
    return false;

  for (let i in labels) {
    let kvp = labels[i];
    if (!pod.metadata.labels[kvp.key] || pod.metadata.labels[kvp.key] != kvp.value)
      return false;
  }

  return true;
};


export { getMongoPods };
