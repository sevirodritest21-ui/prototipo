import os
import gzip
import json
import asyncio
import pymssql

TABLE_ORDER = [
    'campus',
    'usuarios',
    'campus_institucional',
    'carrera_programa',
    'carrera_campus',
    'cubiculos',
    'estudiante',
    'situacion_alumno',
    'estudiante_carrera',
    'sesiones',
    'dias_bloqueados',
    'cubiculos_mantenimiento',
    'reservas',
    'reserva_acompanantes',
    'historial_reservas',
    'incidencias_cubiculos',
    'anuncios_cms',
    'tarjetas_cms',
    'faqs_cms',
    'contacto_mensajes',
    'solicitudes_talleres',
    'estadisticas_reservas_carrera',
    'rate_limits',
    'n8n_chat_histories'
]

DEMO_RESERVAS_NOV = [
    {
        "nombre": "Rodrigo Ignacio Sevilla Jaramillo",
        "rut": "20.908.556-9",
        "fecha": "2026-11-10",
        "hora": "09:00:00",
        "campus_id": 1,
        "cubiculo_codigo": "CUB01-JP",
        "carrera": "INGENIERÍA CIVIL EN INFORMÁTICA",
        "acompanantes": [
            {"nombre": "Ángel Alexis Obreque Herrera", "rut": "22.752.175-9"},
            {"nombre": "Gabriel Ignacio Sepúlveda Millar", "rut": "22.750.376-9"}
        ]
    },
    {
        "nombre": "Constanza Belén Cheuque Espinoza",
        "rut": "22.750.724-1",
        "fecha": "2026-11-10",
        "hora": "10:00:00",
        "campus_id": 1,
        "cubiculo_codigo": "CUB02-JP",
        "carrera": "PSICOLOGÍA",
        "acompanantes": [
            {"nombre": "Fernanda Andrea Lizama Marileo", "rut": "22.751.752-2"}
        ]
    },
    {
        "nombre": "Consuelo Anahís Fuentes Álvarez",
        "rut": "22.749.097-7",
        "fecha": "2026-11-10",
        "hora": "11:00:00",
        "campus_id": 1,
        "cubiculo_codigo": "CUB04-JP",
        "carrera": "INGENIERÍA COMERCIAL",
        "acompanantes": []
    },
    {
        "nombre": "Zaritcha Madelainne Muñoz Cruz",
        "rut": "22.752.702-1",
        "fecha": "2026-11-10",
        "hora": "15:00:00",
        "campus_id": 1,
        "cubiculo_codigo": "CUB03-JP",
        "carrera": "KINESIOLOGÍA",
        "acompanantes": [
            {"nombre": "Antonia Rocío Álvarez López", "rut": "22.752.465-0"}
        ]
    },
    {
        "nombre": "Valentina Paz Morales Soto",
        "rut": "19.821.432-1",
        "fecha": "2026-11-10",
        "hora": "10:00:00",
        "campus_id": 2,
        "cubiculo_codigo": "CUB01-DR",
        "carrera": "DERECHO",
        "acompanantes": [
            {"nombre": "Cristóbal Ignacio Benítez Ramos", "rut": "20.145.892-3"}
        ]
    },
    {
        "nombre": "Camila Andrea Navarro Silva",
        "rut": "18.992.341-K",
        "fecha": "2026-11-10",
        "hora": "12:00:00",
        "campus_id": 2,
        "cubiculo_codigo": "CUB03-DR",
        "carrera": "DERECHO",
        "acompanantes": []
    },
    {
        "nombre": "Matías Alejandro Fuentes Pérez",
        "rut": "21.034.789-5",
        "fecha": "2026-11-10",
        "hora": "14:00:00",
        "campus_id": 7,
        "cubiculo_codigo": "CUB01-JA",
        "carrera": "ARQUITECTURA",
        "acompanantes": [
            {"nombre": "Pablo Henríquez Soto", "rut": "19.777.888-9"}
        ]
    },
    {
        "nombre": "Emely Betsabeth Mena Manquein",
        "rut": "22.752.440-5",
        "fecha": "2026-11-11",
        "hora": "09:00:00",
        "campus_id": 1,
        "cubiculo_codigo": "CUB01-JP",
        "carrera": "PEDAGOGÍA EN EDUCACIÓN DIFERENCIAL",
        "acompanantes": [
            {"nombre": "Claudia Andrea Aguayo Quilán", "rut": "22.749.198-1"}
        ]
    },
    {
        "nombre": "Ángel Alexis Obreque Herrera",
        "rut": "22.752.175-9",
        "fecha": "2026-11-11",
        "hora": "11:00:00",
        "campus_id": 1,
        "cubiculo_codigo": "CUB05-JP",
        "carrera": "INGENIERÍA CIVIL EN INFORMÁTICA",
        "acompanantes": [
            {"nombre": "Joaquín Adolfo Aedo Lagos", "rut": "22.750.293-2"},
            {"nombre": "Rodrigo Ignacio Sevilla Jaramillo", "rut": "20.908.556-9"}
        ]
    },
    {
        "nombre": "Bárbara Andrea Castillo Vera",
        "rut": "21.777.888-9",
        "fecha": "2026-11-11",
        "hora": "14:00:00",
        "campus_id": 1,
        "cubiculo_codigo": "CUB02-JP",
        "carrera": "PSICOLOGÍA",
        "acompanantes": []
    },
    {
        "nombre": "Montserrat Paz Silva Lara",
        "rut": "21.111.222-3",
        "fecha": "2026-11-11",
        "hora": "16:00:00",
        "campus_id": 1,
        "cubiculo_codigo": "CUB06-JP",
        "carrera": "MEDICINA",
        "acompanantes": [
            {"nombre": "Martina Alejandra Henríquez Vera", "rut": "21.789.012-3"}
        ]
    },
    {
        "nombre": "Sebastián Alonso Riquelme Díaz",
        "rut": "20.671.324-9",
        "fecha": "2026-11-11",
        "hora": "10:00:00",
        "campus_id": 2,
        "cubiculo_codigo": "CUB02-DR",
        "carrera": "DERECHO",
        "acompanantes": [
            {"nombre": "Francisca Loyola Pérez", "rut": "20.888.999-1"}
        ]
    },
    {
        "nombre": "Florencia Sofía Valenzuela Castro",
        "rut": "19.554.218-7",
        "fecha": "2026-11-11",
        "hora": "15:00:00",
        "campus_id": 2,
        "cubiculo_codigo": "CUB04-DR",
        "carrera": "DERECHO",
        "acompanantes": []
    },
    {
        "nombre": "Isidora Constanza Toledo Muñoz",
        "rut": "18.776.432-0",
        "fecha": "2026-11-11",
        "hora": "11:00:00",
        "campus_id": 7,
        "cubiculo_codigo": "CUB02-JA",
        "carrera": "DISEÑO",
        "acompanantes": []
    },
    {
        "nombre": "Gabriel Ignacio Sepúlveda Millar",
        "rut": "22.750.376-9",
        "fecha": "2026-11-12",
        "hora": "09:00:00",
        "campus_id": 1,
        "cubiculo_codigo": "CUB03-JP",
        "carrera": "INGENIERÍA CIVIL AMBIENTAL",
        "acompanantes": [
            {"nombre": "Emily Constanza Pérez Riffo", "rut": "22.749.223-6"}
        ]
    },
    {
        "nombre": "Benjamín Andrés Morales Silva",
        "rut": "21.123.456-1",
        "fecha": "2026-11-12",
        "hora": "11:00:00",
        "campus_id": 1,
        "cubiculo_codigo": "CUB01-JP",
        "carrera": "INGENIERÍA CIVIL EN INFORMÁTICA",
        "acompanantes": [
            {"nombre": "Daniela Andrea Poblete Torres", "rut": "21.222.333-4"}
        ]
    },
    {
        "nombre": "Fernanda Andrea Lizama Marileo",
        "rut": "22.751.752-2",
        "fecha": "2026-11-12",
        "hora": "14:00:00",
        "campus_id": 1,
        "cubiculo_codigo": "CUB07-JP",
        "carrera": "TRABAJO SOCIAL",
        "acompanantes": []
    },
    {
        "nombre": "Catalina Dominic Flores Bastías",
        "rut": "22.751.940-1",
        "fecha": "2026-11-12",
        "hora": "16:00:00",
        "campus_id": 1,
        "cubiculo_codigo": "CUB04-JP",
        "carrera": "FONOAUDIOLOGÍA",
        "acompanantes": [
            {"nombre": "Fabiola Helia Delgado Hernández", "rut": "22.751.467-1"}
        ]
    },
    {
        "nombre": "Felipe Andrés Carrasco Vergara",
        "rut": "20.453.811-2",
        "fecha": "2026-11-12",
        "hora": "10:00:00",
        "campus_id": 2,
        "cubiculo_codigo": "CUB01-DR",
        "carrera": "DERECHO",
        "acompanantes": [
            {"nombre": "Catalina Ignacia San Martín Jara", "rut": "19.123.654-8"}
        ]
    },
    {
        "nombre": "Joaquín Eduardo Vera Quintana",
        "rut": "21.229.405-6",
        "fecha": "2026-11-12",
        "hora": "14:00:00",
        "campus_id": 2,
        "cubiculo_codigo": "CUB05-DR",
        "carrera": "DERECHO",
        "acompanantes": []
    },
    {
        "nombre": "Cristóbal Ignacio Benítez Ramos",
        "rut": "20.145.892-3",
        "fecha": "2026-11-12",
        "hora": "15:00:00",
        "campus_id": 7,
        "cubiculo_codigo": "CUB01-JA",
        "carrera": "ARQUITECTURA",
        "acompanantes": []
    },
    {
        "nombre": "Consuelo Anahis Fuentes Álvarez",
        "rut": "22.749.097-7",
        "fecha": "2026-11-16",
        "hora": "09:00:00",
        "campus_id": 1,
        "cubiculo_codigo": "CUB01-JP",
        "carrera": "INGENIERÍA COMERCIAL",
        "acompanantes": [
            {
                "nombre": "Israel Matias Rojas Alvarez",
                "rut": "23.743.688-1"
            },
            {
                "nombre": "Guido Bardi Lemus",
                "rut": "24.369.062-5"
            }
        ]
    },
    {
        "nombre": "Claudia Andrea Aguayo Quilán",
        "rut": "22.749.198-1",
        "fecha": "2026-11-16",
        "hora": "09:00:00",
        "campus_id": 1,
        "cubiculo_codigo": "CUB04-JP",
        "carrera": "INGENIERÍA CIVIL EN INFORMÁTICA",
        "acompanantes": [
            {
                "nombre": "Jaime Alessandro Borja Mendoza",
                "rut": "24.400.608-6"
            }
        ]
    },
    {
        "nombre": "Emily Constanza Pérez Riffo",
        "rut": "22.749.223-6",
        "fecha": "2026-11-16",
        "hora": "10:00:00",
        "campus_id": 1,
        "cubiculo_codigo": "CUB02-JP",
        "carrera": "INGENIERÍA CIVIL EN INFORMÁTICA",
        "acompanantes": [
            {
                "nombre": "Owen Carlo Lillo Guillen",
                "rut": "24.442.565-8"
            }
        ]
    },
    {
        "nombre": "Joaquín Adolfo Alonso Aedo Lagos",
        "rut": "22.750.293-2",
        "fecha": "2026-11-16",
        "hora": "10:00:00",
        "campus_id": 1,
        "cubiculo_codigo": "CUB05-JP",
        "carrera": "INGENIERÍA CIVIL EN INFORMÁTICA",
        "acompanantes": []
    },
    {
        "nombre": "Gabriel Ignacio Sepúlveda Millar",
        "rut": "22.750.376-9",
        "fecha": "2026-11-16",
        "hora": "11:00:00",
        "campus_id": 1,
        "cubiculo_codigo": "CUB01-JP",
        "carrera": "INGENIERÍA CIVIL AMBIENTAL",
        "acompanantes": [
            {
                "nombre": "Daniel Felipe Novoa Palacios",
                "rut": "24.568.429-0"
            },
            {
                "nombre": "Harisson Stiven Obando Arboleda",
                "rut": "24.771.779-K"
            }
        ]
    },
    {
        "nombre": "Constanza Belén Cheuque Espinoza",
        "rut": "22.750.724-1",
        "fecha": "2026-11-16",
        "hora": "11:00:00",
        "campus_id": 1,
        "cubiculo_codigo": "CUB03-JP",
        "carrera": "PSICOLOGÍA",
        "acompanantes": [
            {
                "nombre": "Juan Alejandro Sena Moreno",
                "rut": "25.642.239-5"
            }
        ]
    },
    {
        "nombre": "Fabiola Helia Delgado Hernandez",
        "rut": "22.751.467-1",
        "fecha": "2026-11-16",
        "hora": "11:00:00",
        "campus_id": 1,
        "cubiculo_codigo": "CUB06-JP",
        "carrera": "INGENIERÍA CIVIL EN INFORMÁTICA",
        "acompanantes": []
    },
    {
        "nombre": "Fernanda Andrea Lizama Marileo",
        "rut": "22.751.752-2",
        "fecha": "2026-11-16",
        "hora": "14:00:00",
        "campus_id": 1,
        "cubiculo_codigo": "CUB02-JP",
        "carrera": "TRABAJO SOCIAL",
        "acompanantes": [
            {
                "nombre": "Anasamuel Uzcategui Trincado",
                "rut": "25.772.585-5"
            }
        ]
    },
    {
        "nombre": "Catalina Dominic Flores Bastías",
        "rut": "22.751.940-1",
        "fecha": "2026-11-16",
        "hora": "14:00:00",
        "campus_id": 1,
        "cubiculo_codigo": "CUB08-JP",
        "carrera": "INGENIERÍA CIVIL EN INFORMÁTICA",
        "acompanantes": [
            {
                "nombre": "Valentina Isabella Montenegro Medina",
                "rut": "25.902.501-K"
            },
            {
                "nombre": "Victor Gabriel Yagua Romero",
                "rut": "26.572.913-4"
            }
        ]
    },
    {
        "nombre": "Angel Alexis Obreque Herrera",
        "rut": "22.752.175-9",
        "fecha": "2026-11-16",
        "hora": "15:00:00",
        "campus_id": 1,
        "cubiculo_codigo": "CUB07-JP",
        "carrera": "INGENIERÍA CIVIL EN INFORMÁTICA",
        "acompanantes": [
            {
                "nombre": "Juan Javier Tovar Da Silva",
                "rut": "26.601.725-1"
            }
        ]
    },
    {
        "nombre": "Emely Betsabeth Mena Manquein",
        "rut": "22.752.440-5",
        "fecha": "2026-11-16",
        "hora": "16:00:00",
        "campus_id": 1,
        "cubiculo_codigo": "CUB09-JP",
        "carrera": "PEDAGOGÍA EN EDUCACIÓN DIFERENCIAL CON ESP. EN NEET Y DISCAPACIDAD INTELECTUAL",
        "acompanantes": []
    },
    {
        "nombre": "Antonia Rocío Álvarez López",
        "rut": "22.752.465-0",
        "fecha": "2026-11-16",
        "hora": "09:00:00",
        "campus_id": 2,
        "cubiculo_codigo": "CUB01-DR",
        "carrera": "BACHILLER EN CIENCIAS Y HUMANIDADES",
        "acompanantes": [
            {
                "nombre": "Ambar Luselis Sanchez Hidalgo",
                "rut": "26.640.246-5"
            }
        ]
    },
    {
        "nombre": "Zaritcha Madelainne Muñoz Cruz",
        "rut": "22.752.702-1",
        "fecha": "2026-11-16",
        "hora": "10:00:00",
        "campus_id": 2,
        "cubiculo_codigo": "CUB02-DR",
        "carrera": "KINESIOLOGÍA",
        "acompanantes": [
            {
                "nombre": "Keyber Stayler Graterol Cruz",
                "rut": "26.760.647-1"
            },
            {
                "nombre": "Natanaela Sarai Morales Pozo",
                "rut": "26.837.845-6"
            }
        ]
    },
    {
        "nombre": "Itiam Yarei Morales Raniqueo",
        "rut": "22.753.478-8",
        "fecha": "2026-11-16",
        "hora": "10:00:00",
        "campus_id": 2,
        "cubiculo_codigo": "CUB05-DR",
        "carrera": "GEOLOGÍA",
        "acompanantes": []
    },
    {
        "nombre": "Florencia Annette De Los Angeles Fuentes Alarcón",
        "rut": "22.753.522-9",
        "fecha": "2026-11-16",
        "hora": "11:00:00",
        "campus_id": 2,
        "cubiculo_codigo": "CUB03-DR",
        "carrera": "PEDAGOGÍA EN EDUCACIÓN DIFERENCIAL CON ESP. EN NEET Y DISCAPACIDAD INTELECTUAL",
        "acompanantes": [
            {
                "nombre": "Omar Gabriel Grimaldy Mendoza",
                "rut": "26.929.219-9"
            }
        ]
    },
    {
        "nombre": "Benjamin Anibal Salas Jara",
        "rut": "22.753.568-7",
        "fecha": "2026-11-16",
        "hora": "14:00:00",
        "campus_id": 2,
        "cubiculo_codigo": "CUB04-DR",
        "carrera": "INGENIERÍA CIVIL EN INFORMÁTICA",
        "acompanantes": []
    },
    {
        "nombre": "Sion Esperanza Blanco Sandoval",
        "rut": "22.754.038-9",
        "fecha": "2026-11-16",
        "hora": "15:00:00",
        "campus_id": 2,
        "cubiculo_codigo": "CUB06-DR",
        "carrera": "INGENIERÍA CIVIL EN INFORMÁTICA",
        "acompanantes": [
            {
                "nombre": "Danna Sofia Ramirez Mejia",
                "rut": "26.929.329-2"
            }
        ]
    },
    {
        "nombre": "Ashly Eilyn Neira Valdés",
        "rut": "22.754.273-K",
        "fecha": "2026-11-16",
        "hora": "16:00:00",
        "campus_id": 2,
        "cubiculo_codigo": "CUB07-DR",
        "carrera": "TECNOLOGÍA MÉDICA",
        "acompanantes": [
            {
                "nombre": "Angibel Katiuska Gomez Marcano",
                "rut": "26.973.720-4"
            },
            {
                "nombre": "Aaron Alexander Noriega Muñoz",
                "rut": "26.999.350-2"
            }
        ]
    },
    {
        "nombre": "Monserrath Tais Martinez Muñoz",
        "rut": "22.755.508-4",
        "fecha": "2026-11-16",
        "hora": "09:00:00",
        "campus_id": 7,
        "cubiculo_codigo": "CUB01-JA",
        "carrera": "KINESIOLOGÍA",
        "acompanantes": [
            {
                "nombre": "Juan Gerardo Garcia Da Silva",
                "rut": "27.085.707-8"
            }
        ]
    },
    {
        "nombre": "Dayana Casandra Aedo Quezada",
        "rut": "22.755.635-8",
        "fecha": "2026-11-16",
        "hora": "11:00:00",
        "campus_id": 7,
        "cubiculo_codigo": "CUB01-JA",
        "carrera": "DERECHO",
        "acompanantes": []
    },
    {
        "nombre": "César Bastián Andrés Vargas Soto",
        "rut": "22.756.360-5",
        "fecha": "2026-11-16",
        "hora": "14:00:00",
        "campus_id": 7,
        "cubiculo_codigo": "CUB02-JA",
        "carrera": "GEOLOGÍA",
        "acompanantes": [
            {
                "nombre": "Camila Andrea Romero Fernandez",
                "rut": "27.127.535-8"
            }
        ]
    },
    {
        "nombre": "Francisca Aurora Provoste Aguilas",
        "rut": "22.756.456-3",
        "fecha": "2026-11-16",
        "hora": "16:00:00",
        "campus_id": 7,
        "cubiculo_codigo": "CUB01-JA",
        "carrera": "DERECHO",
        "acompanantes": []
    },
    {
        "nombre": "Nicolás Samuel Caritun Calfuqueo",
        "rut": "22.757.033-4",
        "fecha": "2026-11-17",
        "hora": "09:00:00",
        "campus_id": 1,
        "cubiculo_codigo": "CUB03-JP",
        "carrera": "INGENIERÍA CIVIL EN INFORMÁTICA",
        "acompanantes": [
            {
                "nombre": "Annan John",
                "rut": "27.164.320-9"
            }
        ]
    },
    {
        "nombre": "Leonardo Alcides Antileo Ancatén",
        "rut": "22.757.058-K",
        "fecha": "2026-11-17",
        "hora": "10:00:00",
        "campus_id": 1,
        "cubiculo_codigo": "CUB01-JP",
        "carrera": "INGENIERÍA COMERCIAL",
        "acompanantes": [
            {
                "nombre": "Daniel David Garcia Guarema",
                "rut": "27.306.907-0"
            },
            {
                "nombre": "Angel Alejandro Anaya Aponte",
                "rut": "27.394.415-K"
            }
        ]
    },
    {
        "nombre": "Josefa Ignacia Escobar Jaures",
        "rut": "22.757.329-5",
        "fecha": "2026-11-17",
        "hora": "10:00:00",
        "campus_id": 1,
        "cubiculo_codigo": "CUB06-JP",
        "carrera": "DISEÑO",
        "acompanantes": []
    },
    {
        "nombre": "Digna Flor Huenupil Carilao",
        "rut": "22.757.643-K",
        "fecha": "2026-11-17",
        "hora": "12:00:00",
        "campus_id": 1,
        "cubiculo_codigo": "CUB04-JP",
        "carrera": "FONOAUDIOLOGÍA",
        "acompanantes": [
            {
                "nombre": "Dario Isaac Pari Flores",
                "rut": "27.421.287-K"
            }
        ]
    },
    {
        "nombre": "Armando Ariel Coliñir Coliñir",
        "rut": "22.757.798-3",
        "fecha": "2026-11-17",
        "hora": "12:00:00",
        "campus_id": 1,
        "cubiculo_codigo": "CUB07-JP",
        "carrera": "BACHILLER EN CIENCIAS Y HUMANIDADES",
        "acompanantes": [
            {
                "nombre": "Rosita Elizabeth Fuentes Jorquera",
                "rut": "27.424.409-7"
            },
            {
                "nombre": "Maria Victoria Escalona Guillen",
                "rut": "27.452.392-1"
            }
        ]
    },
    {
        "nombre": "Thiare Martina Sarabia Castel",
        "rut": "22.758.793-8",
        "fecha": "2026-11-17",
        "hora": "14:00:00",
        "campus_id": 1,
        "cubiculo_codigo": "CUB05-JP",
        "carrera": "INGENIERÍA CIVIL EN INFORMÁTICA",
        "acompanantes": [
            {
                "nombre": "Valentina Arlette Baeza Troncozo",
                "rut": "27.467.417-2"
            }
        ]
    },
    {
        "nombre": "Yarickza Elena Painen Molina",
        "rut": "22.758.795-4",
        "fecha": "2026-11-17",
        "hora": "14:00:00",
        "campus_id": 1,
        "cubiculo_codigo": "CUB10-JP",
        "carrera": "PEDAGOGÍA EN LENGUA CASTELLANA Y COMUNICACIÓN",
        "acompanantes": []
    },
    {
        "nombre": "Carla Javiera Barría Morales",
        "rut": "22.758.800-4",
        "fecha": "2026-11-17",
        "hora": "15:00:00",
        "campus_id": 1,
        "cubiculo_codigo": "CUB02-JP",
        "carrera": "MEDICINA VETERINARIA",
        "acompanantes": [
            {
                "nombre": "Yorgelys Del Valle Carreño Gil",
                "rut": "27.500.331-K"
            }
        ]
    },
    {
        "nombre": "Tania Karina Mariano Gonzalez",
        "rut": "22.758.904-3",
        "fecha": "2026-11-17",
        "hora": "17:00:00",
        "campus_id": 1,
        "cubiculo_codigo": "CUB08-JP",
        "carrera": "PEDAGOGÍA EN EDUCACIÓN BÁSICA CON MENCIÓN",
        "acompanantes": []
    },
    {
        "nombre": "Damaris Betzabe Tapia Moreno",
        "rut": "22.760.087-K",
        "fecha": "2026-11-17",
        "hora": "10:00:00",
        "campus_id": 2,
        "cubiculo_codigo": "CUB01-DR",
        "carrera": "NUTRICIÓN Y DIETÉTICA",
        "acompanantes": [
            {
                "nombre": "Diego Josue Coa Blanco",
                "rut": "27.597.198-7"
            }
        ]
    },
    {
        "nombre": "Valeska Rojeris Ramos Valenzuela",
        "rut": "22.760.207-4",
        "fecha": "2026-11-17",
        "hora": "11:00:00",
        "campus_id": 2,
        "cubiculo_codigo": "CUB04-DR",
        "carrera": "INGENIERÍA CIVIL EN INFORMÁTICA",
        "acompanantes": []
    },
    {
        "nombre": "Claudio Alejandro Quidel Campos",
        "rut": "22.761.280-0",
        "fecha": "2026-11-17",
        "hora": "12:00:00",
        "campus_id": 2,
        "cubiculo_codigo": "CUB02-DR",
        "carrera": "TÉCNICO UNIVERSITARIO EN PRODUCCIÓN AGROPECUARIA SOSTENIBLE",
        "acompanantes": [
            {
                "nombre": "Joice Marilyn Ferrel Reyna",
                "rut": "27.760.750-6"
            },
            {
                "nombre": "Paloma Ayelen Díaz Dalidet",
                "rut": "27.788.748-7"
            }
        ]
    },
    {
        "nombre": "Ivan Eduardo Calfuñanco Urra",
        "rut": "22.762.613-5",
        "fecha": "2026-11-17",
        "hora": "15:00:00",
        "campus_id": 2,
        "cubiculo_codigo": "CUB08-DR",
        "carrera": "BACHILLER EN CIENCIAS Y HUMANIDADES",
        "acompanantes": [
            {
                "nombre": "Roybert Yermain Perez Marquez",
                "rut": "27.806.583-9"
            }
        ]
    },
    {
        "nombre": "Mario Ricardo Mella Ingles",
        "rut": "22.763.499-5",
        "fecha": "2026-11-17",
        "hora": "16:00:00",
        "campus_id": 2,
        "cubiculo_codigo": "CUB03-DR",
        "carrera": "INGENIERÍA ELÉCTRICA",
        "acompanantes": []
    },
    {
        "nombre": "Aylee Nicole Flores Lespay",
        "rut": "22.764.508-3",
        "fecha": "2026-11-17",
        "hora": "10:00:00",
        "campus_id": 7,
        "cubiculo_codigo": "CUB01-JA",
        "carrera": "EDUCACIÓN DE PÁRVULOS",
        "acompanantes": [
            {
                "nombre": "Valeria Alejandra Castro Requena",
                "rut": "27.892.071-2"
            }
        ]
    },
    {
        "nombre": "Martín Osvaldo Gallegos Henríquez",
        "rut": "22.767.060-6",
        "fecha": "2026-11-17",
        "hora": "12:00:00",
        "campus_id": 7,
        "cubiculo_codigo": "CUB02-JA",
        "carrera": "INGENIERÍA COMERCIAL",
        "acompanantes": []
    },
    {
        "nombre": "Javiera Yasmin Aguayo Rain",
        "rut": "22.774.022-1",
        "fecha": "2026-11-17",
        "hora": "15:00:00",
        "campus_id": 7,
        "cubiculo_codigo": "CUB01-JA",
        "carrera": "INGENIERÍA CIVIL EN INFORMÁTICA",
        "acompanantes": [
            {
                "nombre": "Leila Ohanna Siqueira Uchoa",
                "rut": "27.953.505-7"
            }
        ]
    },
    {
        "nombre": "Antonella Poleth Troncoso Espinoza",
        "rut": "22.778.579-9",
        "fecha": "2026-11-17",
        "hora": "17:00:00",
        "campus_id": 7,
        "cubiculo_codigo": "CUB02-JA",
        "carrera": "MEDICINA VETERINARIA",
        "acompanantes": []
    },
    {
        "nombre": "Florencia Belén Vidal Jaramillo",
        "rut": "22.787.508-9",
        "fecha": "2026-11-18",
        "hora": "09:00:00",
        "campus_id": 1,
        "cubiculo_codigo": "CUB02-JP",
        "carrera": "TRABAJO SOCIAL",
        "acompanantes": [
            {
                "nombre": "Ileanny Margaret Ruiz Laguna",
                "rut": "27.961.754-1"
            }
        ]
    },
    {
        "nombre": "Cristóbal Alejandro Luengo Vásquez",
        "rut": "22.787.581-K",
        "fecha": "2026-11-18",
        "hora": "11:00:00",
        "campus_id": 1,
        "cubiculo_codigo": "CUB04-JP",
        "carrera": "INGENIERÍA CIVIL EN INFORMÁTICA",
        "acompanantes": [
            {
                "nombre": "Fabiola Andrea Coronel Rodriguez",
                "rut": "28.314.707-K"
            },
            {
                "nombre": "Jose Simon Garcia Estrada",
                "rut": "28.346.730-9"
            }
        ]
    },
    {
        "nombre": "Yasna Fabiola Neira Huircán",
        "rut": "22.787.880-0",
        "fecha": "2026-11-18",
        "hora": "11:00:00",
        "campus_id": 1,
        "cubiculo_codigo": "CUB09-JP",
        "carrera": "FONOAUDIOLOGÍA",
        "acompanantes": []
    },
    {
        "nombre": "Luisa Cristina Martinez Catrileo",
        "rut": "22.795.820-0",
        "fecha": "2026-11-18",
        "hora": "13:00:00",
        "campus_id": 1,
        "cubiculo_codigo": "CUB01-JP",
        "carrera": "INGENIERÍA CIVIL EN INFORMÁTICA",
        "acompanantes": [
            {
                "nombre": "Charline Denaud",
                "rut": "28.393.133-1"
            }
        ]
    },
    {
        "nombre": "Mabel Isolde Cabrera Chavez",
        "rut": "22.858.851-2",
        "fecha": "2026-11-18",
        "hora": "15:00:00",
        "campus_id": 1,
        "cubiculo_codigo": "CUB05-JP",
        "carrera": "INGENIERÍA CIVIL EN INFORMÁTICA",
        "acompanantes": [
            {
                "nombre": "Naidelyn Gabriela Loor Bolaños",
                "rut": "28.506.786-3"
            }
        ]
    },
    {
        "nombre": "Javier Ignacio Espinoza Romero",
        "rut": "22.864.863-9",
        "fecha": "2026-11-18",
        "hora": "15:00:00",
        "campus_id": 1,
        "cubiculo_codigo": "CUB08-JP",
        "carrera": "INGENIERÍA CIVIL EN INFORMÁTICA",
        "acompanantes": []
    },
    {
        "nombre": "Bernardo Antonio Fagalde Acuña",
        "rut": "22.872.325-8",
        "fecha": "2026-11-18",
        "hora": "17:00:00",
        "campus_id": 1,
        "cubiculo_codigo": "CUB03-JP",
        "carrera": "PEDAGOGÍA EN HISTORIA, GEOGRAFÍA Y CIENCIAS SOCIALES",
        "acompanantes": [
            {
                "nombre": "Carlos Adrian Misle Adrian",
                "rut": "28.598.285-5"
            }
        ]
    },
    {
        "nombre": "Ronald Jesús Torres Boll",
        "rut": "22.944.088-8",
        "fecha": "2026-11-18",
        "hora": "09:00:00",
        "campus_id": 2,
        "cubiculo_codigo": "CUB03-DR",
        "carrera": "INGENIERÍA EN CONSTRUCCIÓN",
        "acompanantes": [
            {
                "nombre": "Branyeli Stefhania Berbesi De Vicente",
                "rut": "28.644.280-3"
            }
        ]
    },
    {
        "nombre": "Paula Javiera Soto Reyes",
        "rut": "23.040.415-1",
        "fecha": "2026-11-18",
        "hora": "10:00:00",
        "campus_id": 2,
        "cubiculo_codigo": "CUB07-DR",
        "carrera": "DERECHO",
        "acompanantes": []
    },
    {
        "nombre": "Diego Ignacio Peñaloza Reyes",
        "rut": "23.181.267-9",
        "fecha": "2026-11-18",
        "hora": "12:00:00",
        "campus_id": 2,
        "cubiculo_codigo": "CUB01-DR",
        "carrera": "INGENIERÍA CIVIL EN OBRAS CIVILES",
        "acompanantes": [
            {
                "nombre": "Adrian Jesus Castillo Barco",
                "rut": "28.687.080-5"
            },
            {
                "nombre": "Emily Tatiana Sandoval Ramirez",
                "rut": "28.693.997-K"
            }
        ]
    },
    {
        "nombre": "Camila Sol Molina Vazquez",
        "rut": "23.323.785-K",
        "fecha": "2026-11-18",
        "hora": "14:00:00",
        "campus_id": 2,
        "cubiculo_codigo": "CUB06-DR",
        "carrera": "INGENIERÍA CIVIL EN INFORMÁTICA",
        "acompanantes": [
            {
                "nombre": "Dialessandro Alan Vera Luna",
                "rut": "28.896.773-3"
            }
        ]
    },
    {
        "nombre": "María Catalina Escobar Díaz",
        "rut": "23.358.779-6",
        "fecha": "2026-11-18",
        "hora": "16:00:00",
        "campus_id": 2,
        "cubiculo_codigo": "CUB09-DR",
        "carrera": "TÉCNICO UNIVERSITARIO EN EDUCACIÓN PARVULARIA Y NIVEL  BÁSICO 1",
        "acompanantes": []
    },
    {
        "nombre": "Thiare Belén Díaz Fernández",
        "rut": "23.370.404-0",
        "fecha": "2026-11-18",
        "hora": "09:00:00",
        "campus_id": 7,
        "cubiculo_codigo": "CUB02-JA",
        "carrera": "DISEÑO",
        "acompanantes": [
            {
                "nombre": "Consuelo Anahis Fuentes Álvarez",
                "rut": "22.749.097-7"
            }
        ]
    },
    {
        "nombre": "Gabriel Fernando Huerta Hueichaqueo",
        "rut": "23.464.412-2",
        "fecha": "2026-11-18",
        "hora": "12:00:00",
        "campus_id": 7,
        "cubiculo_codigo": "CUB01-JA",
        "carrera": "INGENIERÍA CIVIL EN INFORMÁTICA",
        "acompanantes": []
    },
    {
        "nombre": "Valentina Cardona Motta",
        "rut": "23.698.144-4",
        "fecha": "2026-11-18",
        "hora": "16:00:00",
        "campus_id": 7,
        "cubiculo_codigo": "CUB02-JA",
        "carrera": "PSICOLOGÍA",
        "acompanantes": [
            {
                "nombre": "Claudia Andrea Aguayo Quilán",
                "rut": "22.749.198-1"
            }
        ]
    }
]

def _ensure_demo_reservas(cur, conn):
    try:
        cur.execute("SELECT id, codigo FROM [cubiculos]")
        cub_map = {row[1]: row[0] for row in cur.fetchall() if row and row[1]}
        if not cub_map:
            return

        for idx, item in enumerate(DEMO_RESERVAS_NOV, start=1):
            cub_id = cub_map.get(item["cubiculo_codigo"])
            if not cub_id:
                continue

            cur.execute(
                "SELECT id FROM [reservas] WHERE [fecha] = %s AND [hora] = %s AND [cubiculo_id] = %s",
                (item["fecha"], item["hora"], cub_id)
            )
            existing = cur.fetchone()
            if existing:
                continue

            cur.execute(
                """
                INSERT INTO [reservas] ([nombre], [rut], [fecha], [hora], [session_id], [created_at], [campus_id], [cubiculo_id], [carrera])
                VALUES (%s, %s, %s, %s, %s, GETDATE(), %s, %s, %s);
                SELECT SCOPE_IDENTITY();
                """,
                (
                    item["nombre"],
                    item["rut"],
                    item["fecha"],
                    item["hora"],
                    f"demo-nov-{idx}",
                    item["campus_id"],
                    cub_id,
                    item["carrera"]
                )
            )
            row_id = cur.fetchone()
            res_id = int(row_id[0]) if row_id and row_id[0] else None

            if res_id:
                for ac in item["acompanantes"]:
                    cur.execute(
                        "INSERT INTO [reserva_acompanantes] ([reserva_id], [nombre], [rut]) VALUES (%s, %s, %s)",
                        (res_id, ac["nombre"], ac["rut"])
                    )
                cur.execute(
                    """
                    INSERT INTO [historial_reservas] ([reserva_id], [nombre], [rut], [campus_id], [fecha], [hora], [estado], [fecha_registro], [carrera])
                    VALUES (%s, %s, %s, %s, %s, %s, 'activa', GETDATE(), %s)
                    """,
                    (
                        res_id,
                        item["nombre"],
                        item["rut"],
                        item["campus_id"],
                        item["fecha"],
                        item["hora"][:5],
                        item["carrera"]
                    )
                )
        conn.commit()
    except Exception:
        try:
            conn.rollback()
        except Exception:
            pass

def _ensure_rls_policies(cur, conn):
    rls_statements = [
        "IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'rls') EXEC('CREATE SCHEMA [rls]')",
        "IF OBJECT_ID('rls.Pol_Seguridad_Filas_UCT', 'SP') IS NOT NULL DROP SECURITY POLICY [rls].[Pol_Seguridad_Filas_UCT]",
        "IF OBJECT_ID('rls.fn_predicado_acceso_reservas', 'IF') IS NOT NULL DROP FUNCTION [rls].[fn_predicado_acceso_reservas]",
        "IF OBJECT_ID('rls.fn_predicado_acceso_historial', 'IF') IS NOT NULL DROP FUNCTION [rls].[fn_predicado_acceso_historial]",
        "IF OBJECT_ID('rls.fn_predicado_acceso_talleres', 'IF') IS NOT NULL DROP FUNCTION [rls].[fn_predicado_acceso_talleres]",
        """
        CREATE FUNCTION [rls].[fn_predicado_acceso_reservas](@id INT, @rut NVARCHAR(50))
        RETURNS TABLE
        WITH SCHEMABINDING
        AS
        RETURN SELECT 1 AS fn_access
        WHERE
            SESSION_CONTEXT(N'rls_enforced') IS NULL
            OR CAST(SESSION_CONTEXT(N'rls_enforced') AS VARCHAR(10)) <> '1'
            OR CAST(SESSION_CONTEXT(N'rls_rol') AS VARCHAR(50)) = 'admin'
            OR REPLACE(REPLACE(REPLACE(UPPER(ISNULL(@rut, N'')), N'.', N''), N'-', N''), N' ', N'') = CAST(SESSION_CONTEXT(N'rls_rut') AS NVARCHAR(50))
            OR EXISTS (
                SELECT 1
                FROM [dbo].[reserva_acompanantes] AS ra
                WHERE ra.[reserva_id] = @id
                  AND REPLACE(REPLACE(REPLACE(UPPER(ISNULL(ra.[rut], N'')), N'.', N''), N'-', N''), N' ', N'') = CAST(SESSION_CONTEXT(N'rls_rut') AS NVARCHAR(50))
            )
        """,
        """
        CREATE FUNCTION [rls].[fn_predicado_acceso_historial](@rut NVARCHAR(50))
        RETURNS TABLE
        WITH SCHEMABINDING
        AS
        RETURN SELECT 1 AS fn_access
        WHERE
            SESSION_CONTEXT(N'rls_enforced') IS NULL
            OR CAST(SESSION_CONTEXT(N'rls_enforced') AS VARCHAR(10)) <> '1'
            OR CAST(SESSION_CONTEXT(N'rls_rol') AS VARCHAR(50)) = 'admin'
            OR REPLACE(REPLACE(REPLACE(UPPER(ISNULL(@rut, N'')), N'.', N''), N'-', N''), N' ', N'') = CAST(SESSION_CONTEXT(N'rls_rut') AS NVARCHAR(50))
        """,
        """
        CREATE FUNCTION [rls].[fn_predicado_acceso_talleres](@rut NVARCHAR(50), @email NVARCHAR(255))
        RETURNS TABLE
        WITH SCHEMABINDING
        AS
        RETURN SELECT 1 AS fn_access
        WHERE
            SESSION_CONTEXT(N'rls_enforced') IS NULL
            OR CAST(SESSION_CONTEXT(N'rls_enforced') AS VARCHAR(10)) <> '1'
            OR CAST(SESSION_CONTEXT(N'rls_rol') AS VARCHAR(50)) = 'admin'
            OR REPLACE(REPLACE(REPLACE(UPPER(ISNULL(@rut, N'')), N'.', N''), N'-', N''), N' ', N'') = CAST(SESSION_CONTEXT(N'rls_rut') AS NVARCHAR(50))
            OR LOWER(LTRIM(RTRIM(ISNULL(@email, N'')))) = LOWER(CAST(SESSION_CONTEXT(N'rls_email') AS NVARCHAR(255)))
        """,
        """
        CREATE SECURITY POLICY [rls].[Pol_Seguridad_Filas_UCT]
            ADD FILTER PREDICATE [rls].[fn_predicado_acceso_reservas]([id], [rut]) ON [dbo].[reservas],
            ADD BLOCK PREDICATE [rls].[fn_predicado_acceso_reservas]([id], [rut]) ON [dbo].[reservas] AFTER INSERT,
            ADD BLOCK PREDICATE [rls].[fn_predicado_acceso_reservas]([id], [rut]) ON [dbo].[reservas] AFTER UPDATE,
            ADD BLOCK PREDICATE [rls].[fn_predicado_acceso_reservas]([id], [rut]) ON [dbo].[reservas] BEFORE DELETE,
            ADD FILTER PREDICATE [rls].[fn_predicado_acceso_historial]([rut]) ON [dbo].[historial_reservas],
            ADD FILTER PREDICATE [rls].[fn_predicado_acceso_talleres]([rut], [email]) ON [dbo].[solicitudes_talleres],
            ADD BLOCK PREDICATE [rls].[fn_predicado_acceso_talleres]([rut], [email]) ON [dbo].[solicitudes_talleres] AFTER INSERT,
            ADD BLOCK PREDICATE [rls].[fn_predicado_acceso_talleres]([rut], [email]) ON [dbo].[solicitudes_talleres] AFTER UPDATE,
            ADD BLOCK PREDICATE [rls].[fn_predicado_acceso_talleres]([rut], [email]) ON [dbo].[solicitudes_talleres] BEFORE DELETE
        WITH (STATE = ON)
        """
    ]
    for stmt in rls_statements:
        try:
            cur.execute(stmt.strip())
            conn.commit()
        except Exception:
            try:
                conn.rollback()
            except Exception:
                pass

def _run_seeder():
    env_host = os.getenv("MSSQL_HOST")
    is_docker = os.path.exists("/.dockerenv") or bool(os.getenv("RUNNING_IN_DOCKER"))
    hosts_to_try = []
    if env_host and (not is_docker or env_host not in ('localhost', '127.0.0.1')):
        hosts_to_try.append(env_host)
    for fallback in ["botsbiblioteca-sqlserver-dev", "sqlserver", "host.docker.internal", "localhost"]:
        if fallback not in hosts_to_try:
            hosts_to_try.append(fallback)

    port = int(os.getenv("MSSQL_PORT", "1433"))
    user = os.getenv("MSSQL_USER", "sa")
    password = os.getenv("MSSQL_PASSWORD", "SqlAdmin2026!")
    db = os.getenv("MSSQL_DB", "reservas_db")

    conn = None
    for h in hosts_to_try:
        try:
            try:
                m_conn = pymssql.connect(server=h, port=port, user=user, password=password, database="master", autocommit=True, login_timeout=4)
                m_cur = m_conn.cursor()
                m_cur.execute(f"IF DB_ID('{db}') IS NULL CREATE DATABASE [{db}];")
                m_conn.close()
            except Exception:
                pass
            conn = pymssql.connect(
                server=h,
                port=port,
                user=user,
                password=password,
                database=db,
                autocommit=False,
                login_timeout=4
            )
            break
        except Exception:
            continue

    if not conn:
        return

    try:
        cur = conn.cursor()
        cur.execute("SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'usuarios'")
        usuarios_exists = cur.fetchone()
        if usuarios_exists:
            cur.execute("SELECT COUNT(*) FROM [usuarios]")
            cnt = cur.fetchone()[0]
            if cnt > 0:
                _ensure_demo_reservas(cur, conn)
                _ensure_rls_policies(cur, conn)
                conn.close()
                return

        base_dir = os.path.dirname(__file__)
        ddl_path = os.path.join(base_dir, "schema_ddl.sql")
        if os.path.exists(ddl_path):
            with open(ddl_path, "r", encoding="utf-8") as f:
                ddl_content = f.read()
            for stmt in ddl_content.split(";"):
                stmt_clean = stmt.strip()
                if stmt_clean:
                    try:
                        cur.execute(stmt_clean)
                        conn.commit()
                    except Exception:
                        conn.rollback()

        seed_path = os.path.join(base_dir, "seed_data.json.gz")
        if not os.path.exists(seed_path):
            conn.close()
            return

        with gzip.open(seed_path, "rt", encoding="utf-8") as f:
            data = json.load(f)

        tables_to_insert = [t for t in TABLE_ORDER if t in data]
        for t in data:
            if t not in tables_to_insert:
                tables_to_insert.append(t)

        for table in tables_to_insert:
            rows = data.get(table, [])
            if not rows:
                continue

            cur.execute(f"SELECT 1 FROM sys.columns WHERE object_id = object_id('{table}') AND is_identity = 1")
            has_identity = bool(cur.fetchone())

            if has_identity:
                try:
                    cur.execute(f"SET IDENTITY_INSERT [{table}] ON")
                except Exception:
                    has_identity = False

            cols = list(rows[0].keys())
            col_list = ", ".join(f"[{c}]" for c in cols)
            val_placeholders = ", ".join(["%s"] * len(cols))
            insert_sql = f"INSERT INTO [{table}] ({col_list}) VALUES ({val_placeholders})"

            batch_size = 500
            for i in range(0, len(rows), batch_size):
                batch = rows[i:i + batch_size]
                batch_vals = []
                for row in batch:
                    row_vals = []
                    for c in cols:
                        v = row.get(c)
                        if isinstance(v, (dict, list)):
                            v = json.dumps(v, ensure_ascii=False)
                        row_vals.append(v)
                    batch_vals.append(tuple(row_vals))

                try:
                    cur.executemany(insert_sql, batch_vals)
                    conn.commit()
                except Exception:
                    conn.rollback()

            if has_identity:
                try:
                    cur.execute(f"SET IDENTITY_INSERT [{table}] OFF")
                except Exception:
                    pass

        _ensure_demo_reservas(cur, conn)
        _ensure_rls_policies(cur, conn)
        conn.close()
    except Exception:
        try:
            conn.close()
        except Exception:
            pass

async def auto_seed_if_empty():
    await asyncio.to_thread(_run_seeder)
