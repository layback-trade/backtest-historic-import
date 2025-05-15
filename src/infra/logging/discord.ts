import axios from 'axios'

const url =
  'https://discord.com/api/webhooks/1371915301720952922/QtKVtXUJwk-J0u-rFe7q4rfyQbAZ7tXDApHroirN3rSmWeMsNNclPJwmidSzgs6TSCuz'
export class DiscordAlert {
  static async warn(message: string): Promise<void> {
    const username = 'Warning'
    const avatarUrl =
      'https://firebasestorage.googleapis.com/v0/b/layback-43391.appspot.com/o/Images%2Fwarning.png?alt=media'
    try {
      axios.post(url, {
        content: message,
        username,
        avatar_url: avatarUrl,
      })
    } catch (error: unknown) {
      console.log(error)
    }
  }

  static async error(message: string) {
    const username = 'Error'
    const avatarUrl =
      'https://firebasestorage.googleapis.com/v0/b/layback-43391.appspot.com/o/Images%2Ferror.png?alt=media'
    try {
      axios.post(url, {
        content: message,
        username,
        avatar_url: avatarUrl,
      })
      console.log('Erro enviado: ', message)
    } catch (error: unknown) {
      console.log(error)
    }
  }

  static async info(message: string) {
    const username = 'Info'
    const avatarUrl =
      'https://firebasestorage.googleapis.com/v0/b/layback-43391.appspot.com/o/Images%2Finfo.png?alt=media'
    try {
      axios.post(url, {
        content: message,
        username,
        avatar_url: avatarUrl,
      })
    } catch (error: unknown) {
      console.log(error)
    }
  }
}
