import process from "process"
import {Metadata, credentials} from "@grpc/grpc-js"

import {NodeSDK} from "@opentelemetry/sdk-node"
import {getNodeAutoInstrumentations} from "@opentelemetry/auto-instrumentations-node"
import {Resource} from "@opentelemetry/resources"
import {SemanticResourceAttributes} from "@opentelemetry/semantic-conventions"
import {OTLPTraceExporter} from "@opentelemetry/exporter-trace-otlp-grpc"
import * as OTELApi from "@opentelemetry/api"

const metadata = new Metadata()

if (process.env.HONEYCOMB_KEY) {
  metadata.set("x-honeycomb-team", process.env.HONEYCOMB_KEY)
}
if (process.env.HONEYCOMB_DATASET) {
  metadata.set("x-honeycomb-dataset", process.env.HONEYCOMB_DATASET)
}

let otlpUrl = "https://api.honeycomb.io:443"
if (process.env.OTLP_EXPORTER) {
  otlpUrl = process.env.OTLP_EXPORTER
}

const traceExporter = new OTLPTraceExporter({
  url: otlpUrl,
  credentials: credentials.createSsl(),
  metadata,
})

const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: "api",
  }),
  traceExporter,
  instrumentations: [getNodeAutoInstrumentations()],
})

sdk.start()
  .then(() => console.log("Tracing initialized"))
  .catch((error) => console.log("Error initializing tracing", error))

OTELApi.diag.setLogger(new OTELApi.DiagConsoleLogger(), OTELApi.DiagLogLevel.DEBUG)

process.on("SIGTERM", () => {
  sdk.shutdown()
    .then(() => console.log("Tracing terminated"))
    .catch((error) => console.log("Error terminating tracing", error))
    .finally(() => process.exit(0))
})
