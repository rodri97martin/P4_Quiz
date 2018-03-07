const {models} = require('./model');
const Sequelize = require('sequelize');
const {log, biglog, colorize, errorlog} = require('./out');

exports.helpCmd = rl => {
    log("Comandos:");
    log("   h|help - Muestra esta ayuda.");
    log("   list - Listar los quizzes existentes.");
    log("   show <id> - Muestra la pregunda y la respuesta del quiz indicado.");
    log("   add - Añadir un nuevo quiz interactivamente.");
    log("   delete <id> - Borrar el quiz indicado.");
    log("   edit <id> - Editar el quiz indicado.");
    log("   test <id> - Probar el quiz indicado.");
    log("   p|play - Jugar a preguntar aleatoriamente todos los quizzes.");
    log("   credits - Créditos.");
    log("   q|quit - Salir del programa.");
    rl.prompt();
};

const validateId = id => {
    return new Promise((resolve, reject) => {
        if (typeof id === "undefined") {
            reject(new Error(`Falta el parámetro <id>.`));
        } else {
            id = parseInt(id);
            if (Number.isNaN(id)) {
                reject(new Error(`El valor del parámetro <id> no es un número`));
            } else {
                resolve(id);
            }
        }
    });
};

exports.quitCmd = rl => {
    rl.close();
};

const makeQuestion = (rl, text) => {
    return new Sequelize.Promise((resolve, reject) => {
        rl.question(colorize(text, 'red'), answer => {
            resolve(answer.trim());
        });
    });
};

exports.addCmd = rl => {
    makeQuestion(rl, 'Introduzca una pregunta: ')
        .then(q => {
            return makeQuestion(rl, 'Introduzca la respuesta: ')
                .then(a => {
                    return {question: q, answer: a};
                });
        })
        .then(quiz => {
            return models.quiz.create(quiz);
        })
        .then((quiz) => {
            log(` ${colorize('Se ha añadido.', 'magenta')}: ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);
        })
        .catch(Sequelize.ValidationError, error => {
            errorlog('El quiz es erróneo.');
            error.errors.forEach(({message}) => errorlog(message));
        })
        .catch(error => {
            errorlog(error.message);
        })
        .then(() => {
            rl.prompt();
        });
};

exports.listCmd = rl => {
    models.quiz.findAll()
        .each(quiz => {
            log(` [${colorize(quiz.id, 'magenta')}]: ${quiz.question}`);
        })
        .catch(error => {
            errorlog(error.message);
        })
        .then(() => {
            rl.prompt();
        });
};

exports.showCmd = (rl, id) => {
    validateId(id)
        .then(id => models.quiz.findById(id))
        .then(quiz => {
            if (!quiz) {
                throw new Error(`No existe un quiz asociado al id=${id}.`);
            }
            log(` [${colorize(quiz.id, 'magenta')}]: ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);
        })
        .catch(error => {
            errorlog(error.message);
        })
        .then(() => {
            rl.prompt();
        });
};

exports.testCmd = (rl, id) => {
    if (typeof id === "undefined") {
        errorlog(`Falta el parámetro id.`);
        rl.prompt();
    } else {
        try {
            const quiz = model.getByIndex(id);
            rl.question(colorize(`${quiz.question}: `, 'red'), answer => {
                if (answer.trim() === quiz.answer){
                    log(`Su respuesta es correcta.`);
                    biglog("Correcta", "green");
                } else {
                    log(`Su respuesta es incorrecta.`);
                    biglog("Incorrecta", "red");
                }
                rl.prompt();
            });

        } catch (error) {
            errorlog(error.message);
            rl.prompt();
        }
    }
};
exports.playCmd = rl => {

    let score = 0;
    let toBeResolved = [];
    for (let i = 0; i < model.count(); i++){
        toBeResolved[i] = i;
    }
    const playOne = () => {
        if (toBeResolved.length === 0) {
            log(`No hay nada más que preguntar.`);
            biglog(`${score}`, "magenta");
            rl.prompt();
        } else {
            try {
                let id = Math.floor(toBeResolved.length * Math.random());
                let quiz = model.getByIndex(toBeResolved[id]);
                rl.question(colorize(`${quiz.question}: `, 'red'), answer => {
                    if (answer.trim() === quiz.answer) {
                        score++;
                        toBeResolved.splice(id, 1);
                        log(`CORRECTO - LLeva ${score} aciertos.`);
                        playOne();
                    } else {
                        log(`INCORRECTO.`);
                        log(`Fin del examen. Aciertos:`);
                        biglog(`${score}`, 'magenta');
                        rl.prompt();
                    }
                });
            } catch (error) {
                errorlog(error.message);
                rl.prompt();
            }
        }
    };
    playOne();
};
exports.deleteCmd = (rl, id) => {
    validateId(id)
        .then(id => models.quiz.destroy({where: {id}}))
        .catch(error => {
            errorlog(error.message);
        })
        .then(() => {
            rl.prompt();
        });
};

exports.editCmd = (rl, id) => {

    if (typeof id === "undefined") {
        errorlog(`Falta el parámetro id.`);
        rl.prompt();
    } else {
        try {
            const quiz = model.getByIndex(id);
            process.stdout.isTTY && setTimeout(() => {rl.write(quiz.question)}, 0);

            rl.question(colorize('Introduzca una pregunta: ', 'red'), question => {

                process.stdout.isTTY && setTimeout(() => {rl.write(quiz.answer)}, 0);

                rl.question(colorize('Introduzca la respuesta: ', 'red'), answer => {
                    model.update(id, question, answer);
                    log(`   Se ha cambiado el quiz ${colorize(id, 'magenta')} por: ${question} ${colorize('=>', 'magenta')} ${answer}`);
                    rl.prompt();
                });
            });
        } catch (error) {
            errorlog(error.message);
            rl.prompt();
        }
    }
};
exports.creditsCmd = rl => {
    log("Autor de la práctica:");
    log("Rodrigo Martín Martín", "green");
    rl.prompt();
};

//log(`No hay nada más que preguntar.`);
//log(`Fin del examen. Aciertos:`);
//biglog(`${score}`, 'magenta');