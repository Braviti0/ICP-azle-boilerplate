// cannister code goes here
// cannister code goes here
//SPDX-License-Identifier: UNLICENSED   
import { $query, $update, Record, StableBTreeMap, Vec, match, Result, nat64, ic, Opt, nat } from 'azle';

type student = Record<{
    first_name: string;
    last_name: string;
    id: nat64;
    testScore: nat64;
}>

type admin = Record<{
    username: string;
    hashKey: string;
}>

type addStudentPayload = Record<{
    firstName: string;
    lastName: string;
    testScore: nat64;
    adminUsername: string;
    adminPassword: string;
}>

type deleteStudentPayload = Record<{
    id: nat64;
    adminUsername: string;
    adminPassword: string;
}>

type adminPayload = Record<{
    userName: string;
    password: string;
}>

type studentByNamePayload = Record<{
    firstName: string;
    lastName: string;
}>


function hashPassword(password: string): string {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      const character = password.charCodeAt(i);
      hash = (hash << 5) - hash + character;
      hash |= 0; // Convert to a 32-bit integer
    }
    return hash.toString();
}

const students = new StableBTreeMap<nat64, student>(0, 200, 200);

var nextStudentId: nat64 = BigInt(1);

var moderator: admin = { username: "", hashKey: "" };

$query
export function getStudentById(id: nat64): Result<student, string> {
    return match(students.get(id), {
        Some: (studentWithId: student) => Result.Ok<student, string>(studentWithId),
        None: () => Result.Err<student, string>(`student with id=${id} does not exist or may have been deleted`)
    });

}


$update
export function initAdmin(payload: adminPayload): Result<string, string> {
    if (moderator.username != "" || moderator.hashKey != "") {
        return Result.Err<string, string>("Admin already set");
    } else if (payload.userName == "" || payload.password == "") {
        return Result.Err<string, string>("Username and password are required");
    }  else {
        moderator.username = payload.userName;
        moderator.hashKey = hashPassword(payload.password);
        return Result.Ok<string, string>("Admin set successfully");
    }
}

$update
export function addStudent(payload: addStudentPayload): Result<string, string> {
    if (moderator.username!= payload.adminUsername || moderator.hashKey!= hashPassword(payload.adminPassword) ) {
        return Result.Err<string, string>(`invalid admin credentials`);
    }
    const student = {
        first_name: payload.firstName,
        last_name: payload.lastName,
        id: nextStudentId,
        testScore: payload.testScore,
    };
    students.insert(nextStudentId, student);
    nextStudentId++;
    return Result.Ok<string, string>(`student added with id=${student.id} and name:${student.first_name} ${student.last_name}`);
}

$update
export function deleteStudent(payload: deleteStudentPayload): Result<string, string> {
    if (moderator.username!= payload.adminUsername || moderator.hashKey!= hashPassword(payload.adminPassword) ) {
        return Result.Err<string, string>(`invalid admin credentials`);
    }
    students.remove(payload.id);
    return Result.Ok<string, string>(`student with id=${payload.id} deleted`);
}

$query
export function getAllStudents(): Result<Vec<student>, string> {
    return Result.Ok<Vec<student>, string>(students.values());
}

$query
export function getStudentCount(): Result<nat, string> {
    return Result.Ok<nat, string>(students.len());
}

$query
export function getStudentByName(payload: studentByNamePayload): Result<Vec<student>, string> {
    return Result.Ok<Vec<student>, string>(students.values().filter(theStudent => theStudent.first_name == payload.firstName && theStudent.last_name == payload.lastName));
}

$query
export function getBestStudent(): Result<student, string> {
    let allStudents = students.values();
    if (allStudents.length == 0) {
      return Result.Err<student, string>("No students exist.");
    } else {
      let bestStudent = allStudents.sort((a, b) => Number(b.testScore - a.testScore))[0];
      return Result.Ok<student, string>(bestStudent);
    }
}

$query
export function studentLeaderBoard(): Result<Vec<student>, string> {
    return Result.Ok<Vec<student>, string>(students.values().sort((a, b) => Number(b.testScore - a.testScore)));
}

