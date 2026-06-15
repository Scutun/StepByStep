const { Resend } = require('resend')

const resend = new Resend(process.env.RESEND_API_KEY)

async function sendVerificationEmail(email, token) {
    if (email.length === 0 || token.length === 0) {
        throw { status: 422, message: 'E-mail и токен обязательны' }
    }

    const verificationLink = `${process.env.EMAIL_CONFIRM_URL}?token=${token}`

    try {
        const { error } = await resend.emails.send({
            from: `StepByStep <${process.env.MAIL_ADDRESS}>`,
            to: email,
            subject: 'Подтверждение электронной почты',
            html: `<p>Здравствуйте!</p>
                <p>Вы зарегистрировались в <b>StepByStep</b>. Для завершения регистрации подтвердите ваш email, нажав на кнопку ниже:</p>
                <p><a href="${verificationLink}" style="display: inline-block; padding: 10px 20px; font-size: 16px; color: #fff; background-color: #007bff; text-decoration: none; border-radius: 5px;">Подтвердить Email</a></p>
                <p>Если вы не запрашивали регистрацию, просто проигнорируйте это сообщение.</p>
                <p>С уважением,<br>Команда StepByStep</p>`,
        })
        if (error) throw { status: 503, message: `Ошибка при отправке письма: ${error.message}` }
    } catch (error) {
        throw { status: 503, message: `Ошибка при отправке письма: ${error.message}` }
    }
}

async function sendResetPasswordEmail(email, token) {
    if (email.length === 0 || token.length === 0) {
        throw { status: 422, message: 'E-mail и токен обязательны' }
    }

    const verificationLink = `${process.env.EMAIL_RESET_PASSWORD_URL}?token=${token}`

    try {
        const { error } = await resend.emails.send({
            from: `StepByStep <${process.env.MAIL_ADDRESS}>`,
            to: email,
            subject: 'Восстановление пароля',
            html: `<p>Здравствуйте!</p>
                <p>Вы запросили <b>восстановление пароля</b> в <b>StepByStep</b>. Чтобы создать новый пароль, нажмите на кнопку ниже:</p>
                <p><a href="${verificationLink}" style="display: inline-block; padding: 10px 20px; font-size: 16px; color: #fff; background-color: #007bff; text-decoration: none; border-radius: 5px;">Сбросить пароль</a></p>
                <p>Если вы не запрашивали восстановление пароля, просто проигнорируйте это письмо.</p>
                <p>С уважением,<br>Команда StepByStep</p>`,
        })
        if (error) throw { status: 503, message: `Ошибка при отправке письма: ${error.message}` }
    } catch (error) {
        throw { status: 503, message: `Ошибка при отправке письма: ${error.message}` }
    }
}

module.exports = { sendResetPasswordEmail, sendVerificationEmail }
