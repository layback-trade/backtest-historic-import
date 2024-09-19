// import { captureException } from '@sentry/node'

import { app } from '@/infra/http/server'

interface OnQueueFailureParams {
  // queue: string
  err: Error
  failedReason?: string
  // parentId?: string
}

export async function onQueueFailure({
  err,
  // queue,
  failedReason,
  // parentId,
}: OnQueueFailureParams) {
  // captureException(err)
  app.log.error(err, failedReason)
}
