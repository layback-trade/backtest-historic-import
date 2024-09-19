import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { Resource } from '@opentelemetry/resources'
import { metrics, NodeSDK } from '@opentelemetry/sdk-node'
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions'
import 'dotenv/config'
import { app } from './http/server'

diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.WARN)

const sdk = new NodeSDK({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: 'historic-data-import',
    [ATTR_SERVICE_VERSION]: '1.0.0',
  }),
  traceExporter: new OTLPTraceExporter({
    url: `${process.env.OTLP_ENDPOINT}/v1/traces`,
  }),
  metricReader: new metrics.PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: `${process.env.OTLP_ENDPOINT}/v1/metrics`,
    }),
  }),
  instrumentations: [getNodeAutoInstrumentations()],
})

process.on('uncaughtException', async function (err) {
  app.log.error('Uncaught exception: ', err)
  await sdk.shutdown()
})

sdk.start()
