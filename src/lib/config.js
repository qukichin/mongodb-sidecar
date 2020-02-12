import * as dns from "dns";


var getMongoPodLabels = () => process.env.MONGO_SIDECAR_POD_LABELS || false;


var getMongoPodLabelCollection = () => {
  let podLabels = getMongoPodLabels();
  if (!podLabels)
    return false;

  let labels = process.env.MONGO_SIDECAR_POD_LABELS.split(',');
  for (let i in labels) {
    let keyAndValue = labels[i].split('=');
    labels[i] = {
      key: keyAndValue[0],
      value: keyAndValue[1]
    };
  };

  return labels;
};


var getk8sROServiceAddress = () => process.env.KUBERNETES_SERVICE_HOST + ":" + process.env.KUBERNETES_SERVICE_PORT;


/**
 * @returns k8sClusterDomain should the name of the kubernetes domain where the cluster is running.
 * Can be convigured via the environmental variable 'KUBERNETES_CLUSTER_DOMAIN'.
 */
var getK8sClusterDomain = () => {
  let domain = process.env.KUBERNETES_CLUSTER_DOMAIN || "cluster.local";
  verifyCorrectnessOfDomain(domain);
  return domain;
};


/**
 * Calls a reverse DNS lookup to ensure that the given custom domain name matches the actual one.
 * Raises a console warning if that is not the case.
 * @param clusterDomain the domain to verify.
 */
const verifyCorrectnessOfDomain = clusterDomain => {
  if (!clusterDomain)
    return;

  let servers = dns.getServers();
  if (!servers || !servers.length) {
    console.log("dns.getServers() didn't return any results when verifying the cluster domain '%s'.", clusterDomain);
    return;
  }

  // 如果可以解析 DNS，则获取第一个主机并尝试检索它的记录
  dns.reverse(servers[0], (err, host) => {
    if (err) {
      console.warn("Error occurred trying to verify the cluster domain '%s'", clusterDomain);
    }
    else if (host.length < 1 || !host[0].endsWith(clusterDomain)) {
      console.warn("Possibly wrong cluster domain name! Detected '%s' but expected similar to '%s'", clusterDomain, host);
    }
    else {
      console.log("The cluster domain '%s' was successfully verified.", clusterDomain);
    }
  });
};


/**
 * @returns k8sMongoServiceName should be the name of the (headless) k8s service operating the mongo pods.
 */
var getK8sMongoServiceName = () => process.env.KUBERNETES_MONGO_SERVICE_NAME || false;


/**
 * @returns mongoPort this is the port on which the mongo instances run. Default is 27017.
 */
var getMongoDbPort = () => {
  let mongoPort = process.env.MONGO_PORT || 27017;
  console.log("Using mongo port: %s", mongoPort);
  return mongoPort;
};


/**
 *  @returns boolean to define the RS as a configsvr or not. Default is false
 */
var isConfigRS = () => {
  let configSvr = (process.env.CONFIG_SVR || '').trim().toLowerCase();
  let configSvrBool = /^(?:y|yes|true|1)$/i.test(configSvr);
  if (configSvrBool)
    console.log("ReplicaSet is configured as a configsvr");

  return configSvrBool;
};


/**
 * @returns boolean
 */
const stringToBool = boolStr => {
  let isTrue = (boolStr === 'true') || false;
  return isTrue;
};


var namespace = process.env.KUBE_NAMESPACE;
var username = process.env.MONGODB_USERNAME;
var password = process.env.MONGODB_PASSWORD;
var database = process.env.MONGODB_DATABASE || 'local';
var loopSleepSeconds = process.env.MONGO_SIDECAR_SLEEP_SECONDS || 5;
var unhealthySeconds = process.env.MONGO_SIDECAR_UNHEALTHY_SECONDS || 15;
var mongoSSLEnabled = stringToBool(process.env.MONGO_SSL_ENABLED);
var mongoSSLAllowInvalidCertificates = stringToBool(process.env.MONGO_SSL_ALLOW_INVALID_CERTIFICATES);
var mongoSSLAllowInvalidHostnames = stringToBool(process.env.MONGO_SSL_ALLOW_INVALID_HOSTNAMES);
var env = process.env.NODE_ENV || 'local';
var mongoPodLabels = getMongoPodLabels();
var mongoPodLabelCollection = getMongoPodLabelCollection();
var k8sROServiceAddress = getk8sROServiceAddress();
var k8sMongoServiceName = getK8sMongoServiceName();
var k8sClusterDomain = getK8sClusterDomain();
var mongoPort = getMongoDbPort();
var isConfigRS = isConfigRS();


export {
  namespace,
  username,
  password,
  database,
  loopSleepSeconds,
  unhealthySeconds,
  mongoSSLEnabled,
  mongoSSLAllowInvalidCertificates,
  mongoSSLAllowInvalidHostnames,
  env,
  mongoPodLabels,
  mongoPodLabelCollection,
  k8sROServiceAddress,
  k8sMongoServiceName,
  k8sClusterDomain,
  mongoPort,
  isConfigRS
};