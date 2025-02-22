//
// Created by Guillermo Galvez on 21/02/2025.
//
#ifndef ALGORITHMS_AND_DATA_STRUCTURES_PROJECT_SUFFIXTREE_H
#define ALGORITHMS_AND_DATA_STRUCTURES_PROJECT_SUFFIXTREE_H

#include <iostream>
#include <string>
#include <vector>
#include <algorithm>
#include <climits> // Para INT_MAX
using namespace std;

#define ALPHABET_SIZE 27  // 26 letras de 'A' a 'Z' + 1 para '$'

// Función auxiliar para mapear un carácter a un índice
// (Este mapeo es parte de la definición de la estructura, ya que el paper asume
//  un alfabeto de tamaño Σ = 26, aquí extendido para incluir '$')
int getIndex(char c) {
    if (c == '$') return 26;
    return c - 'A';
}

// ======================= Estructura de Nodo =======================
// Esta estructura representa un nodo del suffix tree.
// [PAPER: Se define que cada nodo contiene la información de la subcadena (a través de start y end)
//  y un arreglo de punteros a hijos. También se incluye suffixLink para la construcción lineal con Ukkonen.]
struct Node {
    int start;          // Índice de inicio del label (substring) en "text"
    int *end;           // Puntero al índice final del label; para hojas, se comparte la variable global
    int suffixIndex;    // Para hojas, almacena la posición del sufijo en "text" (base 0). Para nodos internos, se deja -1.
    Node* suffixLink;   // [PAPER: Algoritmo 3] Suffix link para optimizar la construcción
    Node* children[ALPHABET_SIZE];  // Arreglo de punteros a hijos, uno por cada posible carácter

    // Constructor: Inicializa los atributos
    Node(int start, int* end) : start(start), end(end), suffixIndex(0), suffixLink(nullptr) {
        for (int i = 0; i < ALPHABET_SIZE; i++)
            children[i] = nullptr;
    }

    // Calcula la longitud del borde (edge) de este nodo
    // [PAPER: Parte de la representación de nodos, donde se usan los índices start y end]
    int edgeLength() {
        return *end - start + 1;
    }
};

// ======================= Clase SuffixTree =======================
// Esta clase implementa el suffix tree usando Ukkonen's algorithm (algoritmos 1 a 6)
// y provee operaciones como búsqueda, encontrar todas las coincidencias (Algoritmo 8-9),
// Longest Repeated Substring (Algoritmo 10) y Shortest Unique Substring (Algoritmo 11).
class SuffixTree {
private:
    // ===== Campos principales (usados en la construcción) =====
    string text;           // Texto de entrada, debe incluir el símbolo terminal '$'
    Node* root;            // [PAPER: "Create an empty root node"] Nodo raíz del árbol
    Node* activeNode;      // Nodo activo (active point) durante la construcción
    int activeLength;      // Longitud activa (cuántos caracteres se han recorrido en la arista activa)
    char activeEdge;       // Carácter activo (la clave de la arista activa, se actualiza según el active point)
    int remainingSuffixCount; // Número de sufijos pendientes de inserción (según Ukkonen)
    int leafEnd;           // Variable global "end" que se comparte entre todas las hojas
    Node* lastCreatedNode; // Último nodo interno creado, utilizado para asignar suffix links (Algoritmo 3)

    // ===== Variables para Algoritmo 10: Longest Repeated Substring (LRS) =====
    int maxDepth;          // Profundidad máxima (longitud total) alcanzada en un nodo interno repetido
    string bestString;     // Substring más largo repetido, actualizado durante la DFS para LRS

    // ===== Variables para Algoritmo 11: Shortest Unique Substring (SUS) =====
    int minLength;         // Longitud mínima encontrada para un substring único

public:
    // ======================= Constructor =======================
    // [PAPER: Inicialización en Construction(S)]
    // Se espera que 's' ya incluya el símbolo terminal '$'.
    SuffixTree(const string &s) : text(s), root(nullptr), activeNode(nullptr),
                                  activeLength(0), activeEdge('\0'), remainingSuffixCount(0),
                                  leafEnd(-1), lastCreatedNode(nullptr),
                                  maxDepth(0), bestString(""), minLength(INT_MAX) {
        buildSuffixTree(); // Algoritmo 1: Construction(S)
        // [EXTRA] Asignación de suffixIndex a cada hoja mediante una DFS.
        // Esto no aparece explícitamente en el pseudocódigo, pero es esencial en implementaciones prácticas.
        setSuffixIndexByDFS(root, 0);
    }

    // ======================= (A) Asignar suffixIndex a las hojas =======================
    // [EXTRA] Función auxiliar: recorre el árbol en DFS y asigna a cada hoja su suffixIndex.
    // Según el paper, la posición del sufijo se puede determinar como n - labelHeight.
    void setSuffixIndexByDFS(Node* node, int labelHeight) {
        if (!node) return;
        bool isLeaf = true;
        // Recorremos todos los hijos
        for (int i = 0; i < ALPHABET_SIZE; i++) {
            if (node->children[i] != nullptr) {
                isLeaf = false;
                Node* child = node->children[i];
                // Llamada recursiva: se suma la longitud del edge del hijo
                setSuffixIndexByDFS(child, labelHeight + child->edgeLength());
            }
        }
        if (isLeaf) {
            // Para una cadena de longitud n, el sufijo que empieza en s se identifica con n - labelHeight.
            node->suffixIndex = (int)text.size() - labelHeight;
        }
    }

    // ======================= Algoritmo 1: Construction(S) =======================
    // Pseudocódigo (ver paper):
    //   For i = 0 to n - 1, llamar a extendSuffixTree(i)
    void buildSuffixTree() {
        int n = text.size();
        int* rootEnd = new int(-1);
        root = new Node(-1, rootEnd);
        activeNode = root;
        activeEdge = '\0';
        activeLength = 0;
        remainingSuffixCount = 0;
        lastCreatedNode = nullptr;
        leafEnd = -1;
        // Itera sobre cada carácter de la cadena
        for (int i = 0; i < n; i++) {
            extendSuffixTree(i); // Algoritmo 5: extendSuffixTree(i)
        }
    }

    // ======================= Algoritmo 2: walkDown(nextNode) =======================
    // Pseudocódigo: Si activeLength ≥ edgeLength, actualiza activeEdge, activeLength y activeNode.
    bool walkDown(Node* nextNode) {
        if (activeLength >= nextNode->edgeLength()) {
            activeEdge = text[nextNode->start + activeLength]; // Actualiza activeEdge
            activeLength -= nextNode->edgeLength();              // Disminuye activeLength
            activeNode = nextNode;                               // Mueve activeNode
            return true;
        }
        return false;
    }

    // ======================= Algoritmo 3: createSuffixLink(node) =======================
    // Pseudocódigo: Si lastCreatedNode ≠ null, asigna lastCreatedNode->suffixLink = node y luego lastCreatedNode = node.
    void createSuffixLink(Node *node, bool setToNode) {
        if (lastCreatedNode != nullptr) {
            lastCreatedNode->suffixLink = node;
        }
        if (setToNode)
            lastCreatedNode = node;
        else
            lastCreatedNode = nullptr;
    }

    // ======================= Algoritmo 4: splitEdge(nextNode, activeLength) =======================
    // Pseudocódigo: Divide la arista de nextNode en la posición (nextNode.start + activeLength - 1),
    // crea un nodo interno (splitNode) y reorganiza los hijos.
    Node* splitEdge(Node* nextNode, int currentActiveLength) {
        int splitPosition = nextNode->start + currentActiveLength - 1;
        int* splitEnd = new int(splitPosition);
        Node* splitNode = new Node(nextNode->start, splitEnd);
        // Reasigna el hijo de activeNode para activeEdge al splitNode.
        activeNode->children[getIndex(activeEdge)] = splitNode;
        // Asigna nextNode como hijo del splitNode usando el siguiente carácter.
        splitNode->children[getIndex(text[splitPosition + 1])] = nextNode;
        // Actualiza nextNode.start para que la arista del nodo dividido comience en splitPosition+1.
        nextNode->start = splitPosition + 1;
        return splitNode;
    }

    // ======================= Algoritmo 5: extendSuffixTree(i) =======================
    // Pseudocódigo: Para cada i, extiende el árbol con text[i], actualizando leafEnd, remainingSuffixCount,
    // activeEdge, activeLength, y utilizando walkDown, splitEdge, createSuffixLink.
    void extendSuffixTree(int i) {
        // Incrementa la variable global leafEnd (end ← end + 1)
        leafEnd = leafEnd + 1;
        // Incrementa el contador de sufijos pendientes (remainingSuffixCount ← remainingSuffixCount + 1)
        remainingSuffixCount++;
        // Reinicia lastCreatedNode
        lastCreatedNode = nullptr;

        // Mientras existan sufijos pendientes (while remainingSuffixCount > 0)
        while (remainingSuffixCount > 0) {
            // Si activeLength es 0, asigna activeEdge al carácter actual
            if (activeLength == 0)
                activeEdge = text[i];

            int edgeIndex = getIndex(activeEdge);
            // Si no existe un hijo en activeNode para activeEdge:
            if (activeNode->children[edgeIndex] == nullptr) {
                // [PAPER: Regla 2] Crear una nueva hoja con start = i y end = leafEnd
                Node* leaf = new Node(i, &leafEnd);
                activeNode->children[edgeIndex] = leaf;
                // Asigna suffixLink al nodo actual si es necesario (Algoritmo 3)
                createSuffixLink(activeNode, false);
            }
            else {
                // Si ya existe un hijo para activeEdge, lo asigna a nextNode
                Node* nextNode = activeNode->children[edgeIndex];
                // Si activeLength ≥ nextNode.edgeLength(), usa walkDown (Algoritmo 2)
                if (activeLength >= nextNode->edgeLength()) {
                    if (walkDown(nextNode))
                        continue;
                }
                // Si el siguiente carácter en el edge de nextNode coincide con text[i]:
                if (text[nextNode->start + activeLength] == text[i]) {
                    // [PAPER: Regla 3] Incrementa activeLength y, si hay un nodo pendiente, actualiza su suffixLink.
                    activeLength = activeLength + 1;
                    if (lastCreatedNode != nullptr)
                        lastCreatedNode->suffixLink = activeNode;
                    // No es necesario extender más en esta fase; se rompe el while.
                    break;
                }
                // Si hay una discrepancia, se divide la arista (Algoritmo 4)
                Node* splitNode = splitEdge(nextNode, activeLength);
                // Crea una nueva hoja para text[i] con start = i y end = leafEnd.
                Node* leaf = new Node(i, &leafEnd);
                splitNode->children[getIndex(text[i])] = leaf;
                // Actualiza lastCreatedNode al nodo interno recién creado.
                createSuffixLink(splitNode, true);
            }
            // Decrementa el contador de sufijos pendientes.
            remainingSuffixCount = remainingSuffixCount - 1;

            // ======================= Algoritmo 6: setActivePoint(i) =======================
            // Actualiza el active point para la próxima extensión.
            if (activeNode == root && activeLength > 0) {
                activeLength = activeLength - 1;
                activeEdge = text[i - remainingSuffixCount + 1];
            }
            else if (activeNode != root) {
                activeNode = (activeNode->suffixLink != nullptr) ? activeNode->suffixLink : root;
            }
        } // Fin del while
    }

    // ======================= Algoritmo 7: Destroy() =======================
    // [PAPER: Algoritmo 7] Destruye el árbol realizando una travesía postorden.
    void destroyNode(Node* v) {
        if (v == nullptr)
            return;
        // Recorrer cada hijo y destruirlo.
        for (int i = 0; i < ALPHABET_SIZE; i++) {
            if (v->children[i] != nullptr) {
                destroyNode(v->children[i]);
            }
        }
        // Si el puntero 'end' no es el de la variable global leafEnd, libéralo.
        if (v->end != &leafEnd)
            delete v->end;
        delete v;
    }

    // Destructor: [EXTRA] Llama a destroyNode para liberar toda la memoria.
    ~SuffixTree() {
        destroyNode(root);
        root = nullptr;
    }

    // ======================= Algoritmo 8: Search(P) =======================
    // Pseudocódigo: Se recorre el árbol siguiendo los caracteres de P. Si en algún
    // momento no existe la rama adecuada o hay discrepancia, retorna false.
    bool search(const string &pattern) {
        Node* v = root;  // v ← Root(T)
        int pos = 0;     // pos ← 0

        // Mientras queden caracteres en P
        while (pos < pattern.size()) {
            char currentChar = pattern[pos];
            int idx = getIndex(currentChar);
            // Si no existe hijo en v con label que empieza con P[pos], retorna false.
            if (v->children[idx] == nullptr)
                return false;
            // Se mueve a ese hijo.
            v = v->children[idx];
            int edgeLen = v->edgeLength();
            int len = (edgeLen < (pattern.size() - pos)) ? edgeLen : (pattern.size() - pos);
            // Compara el substring de la arista con el segmento de P.
            for (int i = 0; i < len; i++) {
                if (text[v->start + i] != pattern[pos + i])
                    return false;
            }
            pos += len;
        }
        return true;
    }

    // ======================= Algoritmo 9: FindAllMatches(P) =======================
    // Pseudocódigo: Se recorre el árbol según P. Si se llega al final del patrón,
    // se recogen los suffixIndex de todas las hojas en ese subárbol.
    // Retorna un vector<int> con las posiciones (en base 0).
    vector<int> findAllMatches(const string &pattern) {
        vector<int> matches;
        Node* v = root;
        int pos = 0;

        while (pos < (int) pattern.size()) {
            int idx = getIndex(pattern[pos]);
            if (v->children[idx] == nullptr)
                return matches; // No se encontró el patrón
            Node* child = v->children[idx];
            int edgeLen = child->edgeLength();
            int len = (edgeLen < (int) pattern.size() - pos) ? edgeLen : ((int) pattern.size() - pos);
            for (int i = 0; i < len; i++) {
                if (text[child->start + i] != pattern[pos + i])
                    return matches; // Discrepancia: patrón no existe
            }
            pos += len;
            v = child;
        }

        // Recolecta los suffixIndex de las hojas del subárbol alcanzado.
        getLeafIndices(v, matches);
        sort(matches.begin(), matches.end());
        matches.erase(unique(matches.begin(), matches.end()), matches.end());
        return matches; // Retorna posiciones en base 0.
    }

    // [EXTRA] Método auxiliar: Recolecta los suffixIndex de todas las hojas en el subárbol de 'node'.
    void getLeafIndices(Node* node, vector<int>& matches) {
        bool isLeaf = true;
        for (int i = 0; i < ALPHABET_SIZE; i++) {
            if (node->children[i] != nullptr) {
                isLeaf = false;
                getLeafIndices(node->children[i], matches);
            }
        }
        if (isLeaf) {
            matches.push_back(node->suffixIndex);
        }
    }

    // ======================= Algoritmo 10: Longest Repeated Substring (LRS) =======================
    // Pseudocódigo: Se recorre el árbol en DFS y se identifica el nodo interno
    // con la ruta (path label) más larga que aparece al menos dos veces.
    string longestRepeatedSubstring() {
        maxDepth = 0;
        bestString.clear();
        lrsDFS(root, 0, "");
        return bestString;
    }

    // DFS auxiliar para LRS.
    // Recorre el árbol, y si un nodo interno tiene al menos 2 hijos y la profundidad es mayor,
    // se actualiza el candidato bestString.
    void lrsDFS(Node* node, int depth, const string &pathSoFar) {
        if (!node) return;
        int childCount = 0;
        for (int i = 0; i < ALPHABET_SIZE; i++) {
            if (node->children[i] != nullptr)
                childCount++;
        }
        if (childCount >= 2 && depth > maxDepth) {
            maxDepth = depth;
            bestString = pathSoFar;
        }
        for (int i = 0; i < ALPHABET_SIZE; i++) {
            Node* child = node->children[i];
            if (child != nullptr) {
                int length = child->edgeLength();
                string edgeLabel = text.substr(child->start, length);
                lrsDFS(child, depth + length, pathSoFar + edgeLabel);
            }
        }
    }

    // ======================= Algoritmo 11: Shortest Unique Substring (SUS) =======================
    // Pseudocódigo: Se recorre el árbol en DFS. En cada nodo interno se verifica si su subárbol
    // conduce a exactamente 1 hoja. Si es así, y si la longitud del path acumulado es menor que el mínimo,
    // se actualiza el candidato. Se ignoran candidatos que contengan '$'.
    // Nota: Se incluye un manejo extra para evaluar candidatos implícitos (prefijos de edges).
    string shortestUniqueSubstring() {
        minLength = INT_MAX;
        bestString = "";
        dfsShortestUnique(root, 0, "");
        return bestString;
    }

    // DFS auxiliar para SUS.
    // Retorna el número de hojas en el subárbol de 'node'.
    // Si un nodo interno tiene exactamente 1 hoja y el path acumulado (sin '$') es menor que el mínimo,
    // se actualiza el candidato.
    int dfsShortestUnique(Node* node, int depth, const string &pathSoFar) {
        if (!node)
            return 0;

        bool isExplicitLeaf = true;
        int totalLeaves = 0;
        // Recorre todos los hijos (se consideran todos, ya que '$' puede estar en la arista,
        // pero se descartará el candidato si contiene '$')
        for (int i = 0; i < ALPHABET_SIZE; i++) {
            if (node->children[i] != nullptr) {
                isExplicitLeaf = false;
                Node* child = node->children[i];
                int len = child->edgeLength();
                string edgeLabel = text.substr(child->start, len);
                totalLeaves += dfsShortestUnique(child, depth + len, pathSoFar + edgeLabel);
            }
        }
        if (isExplicitLeaf) {
            totalLeaves = 1;
        }
        else {
            // Si este nodo (explícito) tiene exactamente 1 hoja y el path acumulado no contiene '$'
            // y su profundidad es menor que el mínimo encontrado, se actualiza.
            if (totalLeaves == 1 && depth < minLength && pathSoFar.find('$') == string::npos) {
                minLength = depth;
                bestString = pathSoFar;
            }
            // [EXTRA] Evaluación de candidatos implícitos:
            // Para cada hijo que es hoja, se considera tomar como candidato el path acumulado
            // más el primer carácter del label del hijo, lo que podría dar un substring único más corto.
            for (int i = 0; i < ALPHABET_SIZE; i++) {
                if (node->children[i] != nullptr) {
                    Node* child = node->children[i];
                    bool childIsLeaf = true;
                    for (int j = 0; j < ALPHABET_SIZE; j++) {
                        if (child->children[j] != nullptr) {
                            childIsLeaf = false;
                            break;
                        }
                    }
                    if (childIsLeaf) {
                        string candidate = pathSoFar + text.substr(child->start, 1);
                        if (depth + 1 < minLength && candidate.find('$') == string::npos) {
                            minLength = depth + 1;
                            bestString = candidate;
                        }
                    }
                }
            }
        }
        return totalLeaves;
    }

    // ======================= [EXTRA] Funciones de impresión =======================
    // Función para imprimir las aristas del árbol (para depuración/visualización)
    void printEdges(Node *n, int height = 0) {
        if (n == nullptr)
            return;
        if (n->start != -1) {
            for (int i = 0; i < height; i++)
                cout << "    ";
            int len = (n->end ? n->edgeLength() : 0);
            cout << text.substr(n->start, len) << "\n";
        }
        for (int i = 0; i < ALPHABET_SIZE; i++) {
            if (n->children[i] != nullptr)
                printEdges(n->children[i], height + 1);
        }
    }

    // [EXTRA] Función para imprimir el árbol completo.
    void printTree() {
        cout << "Suffix Tree:\n";
        printEdges(root);
    }
};

#endif //ALGORITHMS_AND_DATA_STRUCTURES_PROJECT_SUFFIXTREE_H
